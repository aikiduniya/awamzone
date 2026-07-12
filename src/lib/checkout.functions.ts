// Server-side order placement.
// Recomputes prices, discounts, shipping and tax on the server, validates stock,
// atomically decrements inventory, and records the order + items + coupon usage.
// Guest checkout is supported (no auth middleware); everything is recomputed
// from database rows, so the client cannot forge totals, prices or discounts.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CheckoutItem = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(999),
});

const CheckoutInput = z.object({
  items: z.array(CheckoutItem).min(1).max(100),
  email: z.string().email().max(255),
  shipping_address: z.object({
    full_name: z.string().min(1).max(200),
    phone: z.string().max(50).optional().default(""),
    line1: z.string().min(1).max(300),
    line2: z.string().max(300).optional().default(""),
    city: z.string().min(1).max(120),
    state: z.string().max(120).optional().default(""),
    postal_code: z.string().max(40).optional().default(""),
    country: z.string().min(2).max(2),
  }),
  notes: z.string().max(2000).optional().default(""),
  payment_method_id: z.string().uuid(),
  shipping_rate_id: z.string().uuid(),
  coupon_code: z.string().max(64).optional().nullable(),
  user_id: z.string().uuid().nullable().optional(),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => CheckoutInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pricing = await import("@/lib/pricing");

    // 1. Load products + variants
    const productIds = Array.from(new Set(data.items.map((i) => i.product_id)));
    const variantIds = Array.from(
      new Set(data.items.map((i) => i.variant_id).filter((v): v is string => !!v)),
    );

    const [{ data: products, error: pErr }, { data: variants, error: vErr }] = await Promise.all([
      supabaseAdmin.from("products").select("*").in("id", productIds),
      variantIds.length
        ? supabaseAdmin.from("product_variants").select("*").in("id", variantIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (vErr) throw new Error(vErr.message);
    if (!products || products.length !== productIds.length) {
      throw new Error("One or more products no longer exist");
    }
    for (const p of products) {
      if ((p as any).status !== "active") throw new Error(`Product "${(p as any).name}" is unavailable`);
    }

    // Stock preflight (real decrement is atomic via RPC)
    for (const it of data.items) {
      if (it.variant_id) {
        const v: any = variants!.find((x: any) => x.id === it.variant_id);
        if (!v) throw new Error("Variant not found");
        if (v.stock < it.quantity) throw new Error(`Insufficient stock for variant "${v.name}"`);
      } else {
        const p: any = products.find((x: any) => x.id === it.product_id);
        if (p.stock < it.quantity) throw new Error(`Insufficient stock for "${p.name}"`);
      }
    }

    // 2. Load flash sales, tax rates, shipping zones/rates, payment method
    const nowIso = new Date().toISOString();
    const [flashRes, taxRes, zoneRes, rateRes, methodRes] = await Promise.all([
      supabaseAdmin.from("flash_sales").select("*").eq("is_active", true).lte("starts_at", nowIso).gte("ends_at", nowIso),
      supabaseAdmin.from("tax_rates").select("*").eq("is_active", true),
      supabaseAdmin.from("shipping_zones").select("*").eq("is_active", true),
      supabaseAdmin.from("shipping_rates").select("*").eq("id", data.shipping_rate_id).eq("is_active", true).maybeSingle(),
      supabaseAdmin.from("payment_methods").select("*").eq("id", data.payment_method_id).eq("is_active", true).maybeSingle(),
    ]);
    const flashSales = (flashRes.data ?? []) as any[];
    const taxRates = (taxRes.data ?? []) as any[];
    const zones = (zoneRes.data ?? []) as any[];
    const rate = rateRes.data as any;
    const method = methodRes.data as any;
    if (!rate) throw new Error("Selected shipping option is no longer available");
    if (!method) throw new Error("Selected payment method is no longer available");

    // Verify rate belongs to a zone that covers the country
    const zone = pricing.findZoneForCountry(zones as any, data.shipping_address.country);
    if (!zone || rate.zone_id !== zone.id) throw new Error("Shipping option does not match address");

    // 3. Build engine items and compute totals
    const engineItems = data.items.map((it) => {
      const product: any = products.find((p: any) => p.id === it.product_id)!;
      return { product_id: product.id, variant_id: it.variant_id ?? null, quantity: it.quantity, product };
    });

    const subtotal = engineItems.reduce(
      (s, it) => s + pricing.effectivePrice(it.product, flashSales as any) * it.quantity,
      0,
    );
    const totalWeight = engineItems.reduce(
      (s, it) => s + Number(it.product.weight ?? 0) * it.quantity,
      0,
    );
    if (!pricing.rateApplies(rate, subtotal)) throw new Error("Shipping option not valid for cart total");
    let shippingCost = pricing.calculateShipping(rate, subtotal, totalWeight);
    const tax = pricing.calculateTax(engineItems as any, flashSales as any, taxRates as any, data.shipping_address.country);

    // 4. Coupon
    let discount = 0;
    let couponRow: any = null;
    if (data.coupon_code) {
      const { data: c } = await supabaseAdmin
        .from("coupons").select("*").ilike("code", data.coupon_code).eq("is_active", true).maybeSingle();
      if (!c) throw new Error("Coupon not found");
      const validation = await pricing.validateCoupon(
        supabaseAdmin as any,
        (c as any).code,
        engineItems as any,
        flashSales as any,
        data.user_id ?? null,
        shippingCost,
      );
      if (!validation.ok) throw new Error(validation.reason);
      discount = validation.discount;
      couponRow = validation.coupon;
      if (validation.freeShipping) shippingCost = 0;
    }

    const total = Math.max(0, Math.round((subtotal + shippingCost + tax - discount) * 100) / 100);

    // 5. Create order
    const orderPayload: any = {
      user_id: data.user_id ?? null,
      email: data.email,
      subtotal, discount, shipping_cost: shippingCost, tax, total,
      payment_method: method.code,
      payment_status: "pending",
      status: "pending",
      currency: "USD",
      coupon_code: couponRow?.code ?? null,
      shipping_address: data.shipping_address,
      notes: data.notes ?? "",
      timeline: [{ status: "pending", at: nowIso, note: "Order placed" }],
    };
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders").insert(orderPayload).select().single();
    if (oErr) throw new Error(oErr.message);

    try {
      // 6. Order items
      const orderItems = engineItems.map((it) => {
        const price = pricing.effectivePrice(it.product, flashSales as any);
        return {
          order_id: order.id,
          product_id: it.product.id,
          product_name: it.product.name,
          product_image: it.product.images?.[0] ?? null,
          quantity: it.quantity,
          unit_price: price,
          total: price * it.quantity,
          variant_id: it.variant_id,
        };
      });
      const { error: iErr } = await supabaseAdmin.from("order_items").insert(orderItems);
      if (iErr) throw iErr;

      // 7. Atomic stock decrement
      const { error: sErr } = await supabaseAdmin.rpc("decrement_stock", {
        _items: data.items.map((it) => ({
          product_id: it.product_id, variant_id: it.variant_id ?? null, quantity: it.quantity,
        })) as any,
      });
      if (sErr) throw sErr;

      // 8. Stock movements audit
      await supabaseAdmin.from("stock_movements").insert(
        data.items.map((it) => ({
          product_id: it.product_id,
          variant_id: it.variant_id ?? null,
          type: "sale",
          quantity: -it.quantity,
          reference: order.order_number,
          note: "Order placed",
        })) as any,
      );

      // 9. Coupon usage
      if (couponRow) {
        await supabaseAdmin.from("coupon_usages").insert({
          coupon_id: couponRow.id,
          user_id: data.user_id ?? null,
          order_id: order.id,
          discount_amount: discount,
        } as any);
        await supabaseAdmin.from("coupons").update({ used_count: (couponRow.used_count ?? 0) + 1 }).eq("id", couponRow.id);
      }

      // Order confirmation email (fire-and-forget)
      try {
        const { sendOrderEmail } = await import("@/lib/order-emails.server");
        await sendOrderEmail("placed", order as any);
      } catch (e) { console.warn("[order-email] placed hook failed:", (e as Error).message); }

      return {
        order_id: order.id as string,
        order_number: order.order_number as string,
        total,
        payment: {
          method_id: method.id, code: method.code, provider: method.provider,
          config: method.config ?? {}, environment: method.environment, instructions: method.instructions,
        },
      };
    } catch (err) {
      // Rollback the order shell if downstream inserts fail
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw err;
    }
  });

// Cancel or restock server function — restocks items and marks order cancelled.
const CancelInput = z.object({ order_id: z.string().uuid() });
export const cancelOrder = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => CancelInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", data.order_id).maybeSingle();
    if (!order) throw new Error("Order not found");
    if ((order as any).status === "cancelled") return { ok: true };
    const { data: items } = await supabaseAdmin.from("order_items").select("product_id,variant_id,quantity").eq("order_id", data.order_id);
    if (items?.length) {
      await supabaseAdmin.rpc("restock_items", {
        _items: items.map((it: any) => ({ product_id: it.product_id, variant_id: it.variant_id, quantity: it.quantity })) as any,
      });
    }
    const timeline = Array.isArray((order as any).timeline) ? (order as any).timeline : [];
    timeline.push({ status: "cancelled", at: new Date().toISOString(), note: "Order cancelled" });
    await supabaseAdmin.from("orders").update({ status: "cancelled", timeline }).eq("id", data.order_id);
    return { ok: true };
  });
