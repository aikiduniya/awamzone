// Server-only helper: sends order lifecycle emails via Lovable managed email
// API. No-ops gracefully when no email domain is configured or sends fail —
// order flows must never break because email is misconfigured.
//
// Emails covered: order placed, confirmed, shipped, delivered, cancelled,
// refunded, returned. Admin notifications go to `admin_email` from
// site_settings 'contact'. Customer confirmations go to order.email.

import { sendLovableEmail, EmailAPIError } from "@lovable.dev/email-js";

type OrderRow = {
  id: string;
  order_number: string;
  email: string | null;
  total: number | string;
  currency?: string | null;
  status: string;
  payment_status: string;
  shipping_address?: any;
  tracking_number?: string | null;
};

type Branding = { site_name?: string; logo_url?: string };

function fmtMoney(n: number | string, currency = "USD") {
  const v = Number(n);
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v); }
  catch { return `${currency} ${v.toFixed(2)}`; }
}

function baseHtml(title: string, bodyHtml: string, branding: Branding, publicUrl: string) {
  const brand = branding.site_name ?? "AURELIA";
  return `<!doctype html><html><body style="font-family:Helvetica,Arial,sans-serif;background:#f6f5f2;margin:0;padding:24px;color:#1a1a1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e2dd">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #e5e2dd;text-align:center">
      ${branding.logo_url
        ? `<img src="${branding.logo_url}" alt="${brand}" style="height:36px"/>`
        : `<div style="font-family:Georgia,serif;letter-spacing:.3em;font-size:20px;color:#7a5a1f">${brand}</div>`}
    </td></tr>
    <tr><td style="padding:28px">
      <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px 0">${title}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:20px 28px;background:#faf8f3;border-top:1px solid #e5e2dd;font-size:12px;color:#6a6a6a;text-align:center">
      &copy; ${new Date().getFullYear()} ${brand} — <a href="${publicUrl}" style="color:#7a5a1f;text-decoration:none">${publicUrl.replace(/^https?:\/\//, "")}</a>
    </td></tr>
  </table></body></html>`;
}

function orderSummaryHtml(order: OrderRow) {
  const c = order.currency ?? "USD";
  return `<p style="margin:0 0 8px 0">Order <strong>#${order.order_number}</strong></p>
  <p style="margin:0 0 8px 0">Total: <strong>${fmtMoney(order.total, c)}</strong></p>
  <p style="margin:0 0 8px 0">Status: <strong>${order.status}</strong> · Payment: <strong>${order.payment_status}</strong></p>`;
}

const EVENT_COPY: Record<string, { title: (o: OrderRow) => string; body: (o: OrderRow, ctx: any) => string }> = {
  placed: {
    title: (o) => `Thank you for your order #${o.order_number}`,
    body: (o) => `${orderSummaryHtml(o)}
      <p>We've received your order and it's now being processed. You'll get another email once it ships.</p>`,
  },
  confirmed: {
    title: (o) => `Order #${o.order_number} confirmed`,
    body: (o) => `${orderSummaryHtml(o)}<p>Your payment has been confirmed. We'll notify you when your order ships.</p>`,
  },
  shipped: {
    title: (o) => `Order #${o.order_number} has shipped`,
    body: (o, ctx) => `${orderSummaryHtml(o)}
      ${ctx?.tracking_number ? `<p>Tracking number: <strong>${ctx.tracking_number}</strong></p>` : ""}
      ${ctx?.tracking_url ? `<p><a href="${ctx.tracking_url}" style="color:#7a5a1f">Track your shipment</a></p>` : ""}`,
  },
  delivered: {
    title: (o) => `Order #${o.order_number} delivered`,
    body: (o) => `${orderSummaryHtml(o)}<p>Your order has been delivered. We hope you love it.</p>`,
  },
  cancelled: {
    title: (o) => `Order #${o.order_number} cancelled`,
    body: (o) => `${orderSummaryHtml(o)}<p>Your order has been cancelled. If you were charged, a refund is on the way.</p>`,
  },
  refunded: {
    title: (o) => `Order #${o.order_number} refunded`,
    body: (o, ctx) => `${orderSummaryHtml(o)}
      ${ctx?.amount ? `<p>Refund amount: <strong>${fmtMoney(ctx.amount, o.currency ?? "USD")}</strong></p>` : ""}
      <p>Please allow 5–10 business days for the funds to appear on your statement.</p>`,
  },
  returned: {
    title: (o) => `Return processed for order #${o.order_number}`,
    body: (o) => `${orderSummaryHtml(o)}<p>Your return has been processed.</p>`,
  },
};

export type OrderEmailEvent = keyof typeof EVENT_COPY;

async function loadContext(): Promise<{
  branding: Branding;
  senderDomain: string | null;
  fromEmail: string | null;
  fromName: string;
  adminEmail: string | null;
  publicUrl: string;
}> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [b, c, s] = await Promise.all([
      supabaseAdmin.from("site_settings").select("value").eq("key", "branding").maybeSingle(),
      supabaseAdmin.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
      supabaseAdmin.from("site_settings").select("value").eq("key", "smtp").maybeSingle(),
    ]);
    const branding = ((b.data?.value as any) ?? {}) as Branding;
    const contact = (c.data?.value as any) ?? {};
    const smtp = (s.data?.value as any) ?? {};
    const fromEmail: string | null = smtp.from_email || null;
    const fromName: string = smtp.from_name || branding.site_name || "AURELIA";
    const senderDomain = fromEmail && fromEmail.includes("@") ? fromEmail.split("@")[1] : null;
    return {
      branding,
      senderDomain,
      fromEmail,
      fromName,
      adminEmail: contact.email ?? null,
      publicUrl: process.env.PUBLIC_APP_URL ?? "https://awamzone.lovable.app",
    };
  } catch {
    return { branding: {}, senderDomain: null, fromEmail: null, fromName: "AURELIA", adminEmail: null, publicUrl: "https://awamzone.lovable.app" };
  }
}

async function send(to: string, subject: string, html: string, ctx: Awaited<ReturnType<typeof loadContext>>, idemKey: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || !ctx.senderDomain || !ctx.fromEmail) {
    console.info("[order-email] skipped (email not configured):", subject);
    return { sent: false, reason: "not_configured" as const };
  }
  try {
    const res = await sendLovableEmail(
      {
        to,
        from: `${ctx.fromName} <${ctx.fromEmail}>`,
        sender_domain: ctx.senderDomain,
        subject,
        html,
        text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      },
      { apiKey, idempotencyKey: idemKey },
    );
    return res;
  } catch (err) {
    if (err instanceof EmailAPIError) {
      console.warn("[order-email] api error:", err.code, err.message);
    } else {
      console.warn("[order-email] send failed:", (err as Error).message);
    }
    return { sent: false, reason: "error" as const };
  }
}

export async function sendOrderEmail(event: OrderEmailEvent, order: OrderRow, extra: any = {}) {
  const copy = EVENT_COPY[event];
  if (!copy) return;
  const ctx = await loadContext();
  const title = copy.title(order);
  const body = copy.body(order, extra);
  const html = baseHtml(title, body, ctx.branding, ctx.publicUrl);
  const idem = `order-${order.id}-${event}`;

  // Customer email
  if (order.email) {
    await send(order.email, title, html, ctx, `${idem}-cust`);
  }
  // Admin notification for new orders / cancellations / returns
  if (ctx.adminEmail && (event === "placed" || event === "cancelled" || event === "returned")) {
    const adminHtml = baseHtml(`[Admin] ${title}`, `<p>An order event occurred.</p>${orderSummaryHtml(order)}
      <p>Customer: ${order.email ?? "guest"}</p>`, ctx.branding, ctx.publicUrl);
    await send(ctx.adminEmail, `[Admin] ${title}`, adminHtml, ctx, `${idem}-admin`);
  }
}
