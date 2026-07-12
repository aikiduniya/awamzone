// Order-lifecycle server functions: quote, admin transitions, shipments,
// refunds, customer return requests, guest-state merge. All server-side
// so RLS + business rules can't be bypassed by the client.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ─── QUOTE ──────────────────────────────────────────────────────────────
const QuoteInput = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    variant_id: z.string().uuid().nullable().optional(),
    quantity: z.number().int().min(1).max(999),
  })).min(1),
  country: z.string().min(2).max(2),
  shipping_rate_id: z.string().uuid().nullable().optional(),
  coupon_code: z.string().max(64).nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
});

export const quoteOrder = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => QuoteInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pricing = await import("@/lib/pricing");
    const nowIso = new Date().toISOString();

    const productIds = Array.from(new Set(data.items.map((i) => i.product_id)));
    const [{ data: products }, flashRes, taxRes, zoneRes, ratesRes] = await Promise.all([
      supabaseAdmin.from("products").select("*").in("id", productIds),
      supabaseAdmin.from("flash_sales").select("*").eq("is_active", true).lte("starts_at", nowIso).gte("ends_at", nowIso),
      supabaseAdmin.from("tax_rates").select("*").eq("is_active", true),
      supabaseAdmin.from("shipping_zones").select("*").eq("is_active", true),
      supabaseAdmin.from("shipping_rates").select("*").eq("is_active", true).order("sort_order"),
    ]);
    if (!products || products.length !== productIds.length) throw new Error("Some products are unavailable");

    const engineItems = data.items.map((it) => ({
      product_id: it.product_id,
      variant_id: it.variant_id ?? null,
      quantity: it.quantity,
      product: (products as any[]).find((p) => p.id === it.product_id)!,
    }));
    const flashSales = (flashRes.data ?? []) as any[];
    const zones = (zoneRes.data ?? []) as any[];
    const rates = (ratesRes.data ?? []) as any[];
    const taxRates = (taxRes.data ?? []) as any[];

    const subtotal = engineItems.reduce(
      (s, it) => s + pricing.effectivePrice(it.product, flashSales as any) * it.quantity, 0,
    );
    const totalWeight = engineItems.reduce(
      (s, it) => s + Number(it.product.weight ?? 0) * it.quantity, 0,
    );
    const zone = pricing.findZoneForCountry(zones as any, data.country);
    const zoneRates = rates.filter((r: any) => r.zone_id === zone?.id && pricing.rateApplies(r as any, subtotal));
    const selectedRate = data.shipping_rate_id
      ? zoneRates.find((r: any) => r.id === data.shipping_rate_id) ?? zoneRates[0]
      : zoneRates[0];
    let shipping = selectedRate ? pricing.calculateShipping(selectedRate as any, subtotal, totalWeight) : 0;
    const tax = pricing.calculateTax(engineItems as any, flashSales as any, taxRates as any, data.country);

    let discount = 0;
    let couponInfo: { code: string; freeShipping: boolean } | null = null;
    if (data.coupon_code) {
      const res = await pricing.validateCoupon(
        supabaseAdmin as any, data.coupon_code, engineItems as any, flashSales as any,
        data.user_id ?? null, shipping,
      );
      if (res.ok) {
        discount = res.discount;
        if (res.freeShipping) shipping = 0;
        couponInfo = { code: res.coupon.code, freeShipping: res.freeShipping };
      } else {
        return { error: res.reason, subtotal, shipping, tax, discount: 0, total: subtotal + shipping + tax, availableRates: zoneRates, zone, coupon: null };
      }
    }

    const total = Math.max(0, Math.round((subtotal + shipping + tax - discount) * 100) / 100);
    return {
      error: null as string | null,
      subtotal, shipping, tax, discount, total,
      availableRates: zoneRates,
      selectedRateId: selectedRate?.id ?? null,
      zone,
      coupon: couponInfo,
    };
  });

// ─── ADMIN: STATUS TRANSITION ───────────────────────────────────────────
const UpdateStatusInput = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["pending","confirmed","processing","packed","shipped","delivered","cancelled","returned","refunded"]),
  note: z.string().max(1000).optional().default(""),
});
export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => UpdateStatusInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", data.order_id).maybeSingle();
    if (!order) throw new Error("Order not found");
    const timeline = Array.isArray((order as any).timeline) ? (order as any).timeline : [];
    timeline.push({ status: data.status, at: new Date().toISOString(), note: data.note });

    // Auto-restock on cancel/returned
    if ((data.status === "cancelled" || data.status === "returned") &&
        (order as any).status !== "cancelled" && (order as any).status !== "returned") {
      const { data: items } = await supabaseAdmin.from("order_items").select("product_id,variant_id,quantity").eq("order_id", data.order_id);
      if (items?.length) {
        await supabaseAdmin.rpc("restock_items", {
          _items: items.map((it: any) => ({ product_id: it.product_id, variant_id: it.variant_id, quantity: it.quantity })) as any,
        });
      }
    }
    await supabaseAdmin.from("orders").update({ status: data.status as any, timeline }).eq("id", data.order_id);
    if (data.note) {
      await supabaseAdmin.from("order_events").insert({
        order_id: data.order_id, event_type: "admin.note",
        message: data.note, actor_id: context.userId,
      } as any);
    }
    // Fire order status email (fire-and-forget)
    try {
      const { sendOrderEmail } = await import("@/lib/order-emails.server");
      const eventMap: Record<string, string> = {
        confirmed: "confirmed", shipped: "shipped", delivered: "delivered",
        cancelled: "cancelled", refunded: "refunded", returned: "returned",
      };
      const ev = eventMap[data.status];
      if (ev) await sendOrderEmail(ev as any, { ...(order as any), status: data.status } as any);
    } catch (e) { console.warn("[order-email] status hook failed:", (e as Error).message); }
    return { ok: true };
  });

// ─── ADMIN: SHIPMENT ────────────────────────────────────────────────────
const CreateShipmentInput = z.object({
  order_id: z.string().uuid(),
  carrier: z.string().max(100).optional().default(""),
  tracking_number: z.string().max(200).optional().default(""),
  tracking_url: z.string().url().max(500).optional().or(z.literal("")).default(""),
  notes: z.string().max(1000).optional().default(""),
  mark_shipped: z.boolean().optional().default(true),
});
export const createShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => CreateShipmentInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: shipment, error } = await supabaseAdmin.from("shipments").insert({
      order_id: data.order_id,
      carrier: data.carrier || null,
      tracking_number: data.tracking_number || null,
      tracking_url: data.tracking_url || null,
      notes: data.notes || null,
      status: data.mark_shipped ? "shipped" : "pending",
      shipped_at: data.mark_shipped ? new Date().toISOString() : null,
    } as any).select().single();
    if (error) throw new Error(error.message);
    if (data.mark_shipped) {
      await supabaseAdmin.from("orders").update({
        status: "shipped" as any,
        tracking_number: data.tracking_number || null,
      }).eq("id", data.order_id);
      try {
        const { sendOrderEmail } = await import("@/lib/order-emails.server");
        const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", data.order_id).maybeSingle();
        if (order) await sendOrderEmail("shipped", order as any, { tracking_number: data.tracking_number, tracking_url: data.tracking_url });
      } catch (e) { console.warn("[order-email] shipment hook failed:", (e as Error).message); }
    }
    return { shipment };
  });

// ─── ADMIN: REFUND (records refund only; provider capture is separate) ──
const RefundInput = z.object({
  order_id: z.string().uuid(),
  amount: z.number().min(0),
  reason: z.string().max(500).optional().default(""),
  restock: z.boolean().optional().default(false),
});
export const refundOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => RefundInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", data.order_id).maybeSingle();
    if (!order) throw new Error("Order not found");
    const alreadyRefunded = Number((order as any).refunded_amount ?? 0);
    const newRefunded = alreadyRefunded + Number(data.amount);
    const isFull = newRefunded >= Number((order as any).total) - 0.01;

    await supabaseAdmin.from("orders").update({
      refunded_amount: newRefunded,
      payment_status: (isFull ? "refunded" : "partially_refunded") as any,
      ...(isFull ? { status: "refunded" as any } : {}),
    } as any).eq("id", data.order_id);

    await supabaseAdmin.from("order_events").insert({
      order_id: data.order_id, event_type: "payment.refunded",
      message: `Refunded ${data.amount}${data.reason ? " — " + data.reason : ""}`,
      actor_id: context.userId,
      metadata: { amount: data.amount, reason: data.reason, cumulative: newRefunded } as any,
    } as any);

    if (data.restock) {
      const { data: items } = await supabaseAdmin.from("order_items").select("product_id,variant_id,quantity").eq("order_id", data.order_id);
      if (items?.length) {
        await supabaseAdmin.rpc("restock_items", {
          _items: items.map((it: any) => ({ product_id: it.product_id, variant_id: it.variant_id, quantity: it.quantity })) as any,
        });
      }
    }
    return { ok: true, refunded_amount: newRefunded, full: isFull };
  });

// ─── CUSTOMER: RETURN REQUEST ───────────────────────────────────────────
const ReturnRequestInput = z.object({
  order_id: z.string().uuid(),
  reason: z.string().min(3).max(2000),
  items: z.array(z.object({
    order_item_id: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).min(1).max(50),
});
export const createReturnRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ReturnRequestInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("id,user_id,status").eq("id", data.order_id).maybeSingle();
    if (!order) throw new Error("Order not found");
    if ((order as any).user_id !== context.userId) throw new Error("Forbidden");
    if (!["delivered", "shipped"].includes((order as any).status)) {
      throw new Error("Returns can only be requested after delivery");
    }
    const { data: request, error } = await supabaseAdmin.from("return_requests").insert({
      order_id: data.order_id,
      user_id: context.userId,
      reason: data.reason,
      items: data.items as any,
      status: "requested",
    } as any).select().single();
    if (error) throw new Error(error.message);
    return { request };
  });

// ─── ADMIN: RETURN DECISION ─────────────────────────────────────────────
const ReturnDecisionInput = z.object({
  return_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "received", "refunded"]),
  admin_notes: z.string().max(2000).optional().default(""),
  refund_amount: z.number().min(0).optional(),
});
export const decideReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ReturnDecisionInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = { status: data.decision, admin_notes: data.admin_notes };
    if (data.refund_amount != null) patch.refund_amount = data.refund_amount;
    const { error } = await supabaseAdmin.from("return_requests").update(patch).eq("id", data.return_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── GUEST STATE MERGE ─────────────────────────────────────────────────
const MergeGuestInput = z.object({
  cart: z.array(z.object({
    product_id: z.string().uuid(),
    variant_id: z.string().uuid().nullable().optional(),
    quantity: z.number().int().min(1).max(999),
  })).max(200).default([]),
  wishlist_ids: z.array(z.string().uuid()).max(500).default([]),
});
export const mergeGuestState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => MergeGuestInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Cart: upsert-merge
    for (const it of data.cart) {
      const { data: existing } = await supabaseAdmin.from("cart_items")
        .select("id,quantity").eq("user_id", context.userId)
        .eq("product_id", it.product_id)
        .is("variant_id", it.variant_id ?? null as any).maybeSingle();
      if (existing) {
        await supabaseAdmin.from("cart_items").update({
          quantity: Math.min(999, Number((existing as any).quantity) + it.quantity),
        }).eq("id", (existing as any).id);
      } else {
        await supabaseAdmin.from("cart_items").insert({
          user_id: context.userId, product_id: it.product_id,
          variant_id: it.variant_id ?? null, quantity: it.quantity,
        } as any);
      }
    }
    // Wishlist: insert missing
    if (data.wishlist_ids.length) {
      const rows = data.wishlist_ids.map((pid) => ({ user_id: context.userId, product_id: pid }));
      await supabaseAdmin.from("wishlists").upsert(rows as any, { onConflict: "user_id,product_id" });
    }
    return { ok: true };
  });
