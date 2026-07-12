// Printable, download-as-PDF (via browser print) invoice page.
// Accessible from account & admin order pages. Uses window.print() – users
// print/save as PDF from the browser.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import { Printer } from "lucide-react";

export const Route = createFileRoute("/invoice/$orderId")({
  head: () => ({ meta: [{ title: "Invoice | AURELIA" }, { name: "robots", content: "noindex" }] }),
  component: InvoicePage,
});

function InvoicePage() {
  const { orderId } = Route.useParams();

  const { data } = useQuery({
    queryKey: ["invoice", orderId],
    queryFn: async () => {
      const [orderRes, itemsRes, brandingRes, contactRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
        supabase.from("site_settings").select("value").eq("key", "branding").maybeSingle(),
        supabase.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
      ]);
      return {
        order: orderRes.data,
        items: itemsRes.data ?? [],
        branding: (brandingRes.data?.value ?? {}) as any,
        contact: (contactRes.data?.value ?? {}) as any,
      };
    },
  });

  if (!data?.order) return <div className="p-16 text-center text-muted-foreground">Loading invoice…</div>;

  const o = data.order as any;
  const items = data.items as any[];
  const b = data.branding;
  const c = data.contact;

  const shipping = (o.shipping_address ?? {}) as any;
  const billing = (o.billing_address ?? o.shipping_address ?? {}) as any;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto p-6 print:p-0">
        <div className="print:hidden mb-6 flex justify-end">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">
            <Printer size={14} /> Print / Save as PDF
          </button>
        </div>

        <div className="bg-card border border-border rounded-lg p-8 print:border-0 print:rounded-none print:shadow-none">
          <div className="flex justify-between items-start mb-8">
            <div>
              {b.logo_url ? <img src={b.logo_url} alt={b.site_name ?? "Logo"} className="h-10 mb-2" /> : <div className="text-2xl font-serif tracking-[0.3em] text-primary">{b.site_name ?? "AURELIA"}</div>}
              <div className="text-xs text-muted-foreground">
                {c.email && <div>{c.email}</div>}
                {c.phone && <div>{c.phone}</div>}
                {c.address && <div>{c.address}</div>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-serif">Invoice</div>
              <div className="text-xs text-muted-foreground mt-1">#{o.order_number}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] mt-2">
                Status: <span className="text-primary">{o.status}</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em]">
                Payment: <span className="text-primary">{o.payment_status}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Billed to</div>
              <div>{billing.name || o.email}</div>
              <div className="text-xs text-muted-foreground">
                {billing.line1}{billing.line2 ? `, ${billing.line2}` : ""}<br />
                {[billing.city, billing.state, billing.postal_code].filter(Boolean).join(", ")}<br />
                {billing.country}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Ship to</div>
              <div>{shipping.name || o.email}</div>
              <div className="text-xs text-muted-foreground">
                {shipping.line1}{shipping.line2 ? `, ${shipping.line2}` : ""}<br />
                {[shipping.city, shipping.state, shipping.postal_code].filter(Boolean).join(", ")}<br />
                {shipping.country}
              </div>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border">
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-border/60">
                  <td className="py-2">
                    {it.product_name}
                    {it.variant_name && <div className="text-xs text-muted-foreground">{it.variant_name}</div>}
                  </td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  <td className="py-2 text-right">{formatMoney(it.price)}</td>
                  <td className="py-2 text-right">{formatMoney(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <Row label="Subtotal" value={formatMoney(o.subtotal ?? 0)} />
              {Number(o.discount_amount ?? 0) > 0 && <Row label="Discount" value={`- ${formatMoney(o.discount_amount)}`} />}
              <Row label="Shipping" value={formatMoney(o.shipping_amount ?? 0)} />
              <Row label="Tax" value={formatMoney(o.tax_amount ?? 0)} />
              <div className="border-t border-border pt-2 mt-2 flex justify-between font-medium">
                <div>Total</div><div>{formatMoney(o.total ?? 0)}</div>
              </div>
              <div className="text-xs text-muted-foreground pt-2">
                Payment method: <span className="text-foreground">{o.payment_method ?? "—"}</span>
              </div>
            </div>
          </div>

          <div className="mt-10 text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">
            Thank you for your order.
          </div>
        </div>
      </div>
      <style>{`@media print { body { background: white !important; } }`}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-muted-foreground"><div>{label}</div><div className="text-foreground">{value}</div></div>;
}
