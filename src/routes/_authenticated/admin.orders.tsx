import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

const STATUSES = ["pending","confirmed","processing","packed","shipped","delivered","cancelled","returned","refunded"] as const;

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersAdmin,
});

function OrdersAdmin() {
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<any>(null);

  const { data, refetch } = useQuery({
    queryKey: ["admin-orders", status],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (status !== "all") q = q.eq("status", status as any);
      return (await q).data ?? [];
    },
  });

  const openOrder = async (id: string) => {
    const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);
    setSelected({ ...order, items: items ?? [] });
  };

  const updateStatus = async (newStatus: string) => {
    const timeline = [...(selected.timeline ?? []), { status: newStatus, at: new Date().toISOString() }];
    const { error } = await supabase.from("orders").update({ status: newStatus, timeline }).eq("id", selected.id);
    if (error) return toast.error(error.message);
    toast.success("Order updated"); setSelected({ ...selected, status: newStatus, timeline }); refetch();
  };

  return (
    <>
      <div className="flex items-end justify-between mb-8">
        <div><div className="eyebrow mb-2">Sales</div><h1 className="text-4xl font-serif">Orders</h1></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-transparent border border-border px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface"><tr className="text-left eyebrow"><th className="p-4">Order</th><th className="p-4">Date</th><th className="p-4">Customer</th><th className="p-4">Status</th><th className="p-4">Payment</th><th className="p-4 text-right">Total</th><th /></tr></thead>
          <tbody>
            {data?.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-4 font-mono text-primary">{o.order_number}</td>
                <td className="p-4 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="p-4">{o.email}</td>
                <td className="p-4 text-xs uppercase tracking-[0.2em]">{o.status}</td>
                <td className="p-4 text-xs uppercase tracking-[0.2em]">{o.payment_status}</td>
                <td className="p-4 text-right">{formatMoney(o.total)}</td>
                <td className="p-4 text-right"><button onClick={() => openOrder(o.id)} className="text-primary text-xs uppercase tracking-[0.2em]">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-background/85 backdrop-blur z-50 overflow-auto p-4" onClick={() => setSelected(null)}>
          <div className="bg-surface border border-border max-w-3xl mx-auto p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="eyebrow mb-1">Order</div>
                <h2 className="text-3xl font-serif text-primary">{selected.order_number}</h2>
                <div className="text-sm text-muted-foreground mt-1">{new Date(selected.created_at).toLocaleString()}</div>
              </div>
              <button onClick={() => setSelected(null)}><X /></button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="border border-border p-4">
                <div className="eyebrow mb-2">Customer</div>
                <div className="text-sm">{selected.email}</div>
                {selected.shipping_address && (
                  <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {selected.shipping_address.full_name}<br />
                    {selected.shipping_address.line1}, {selected.shipping_address.city}<br />
                    {selected.shipping_address.country} {selected.shipping_address.postal_code}
                  </div>
                )}
              </div>
              <div className="border border-border p-4">
                <div className="eyebrow mb-2">Status</div>
                <select value={selected.status} onChange={(e) => updateStatus(e.target.value)} className="w-full bg-transparent border border-border px-3 py-2 text-sm">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="mt-2 text-xs text-muted-foreground">Payment: {selected.payment_status} ({selected.payment_method})</div>
                <input placeholder="Tracking number" defaultValue={selected.tracking_number ?? ""} onBlur={async (e) => { await supabase.from("orders").update({ tracking_number: e.target.value }).eq("id", selected.id); }} className="w-full bg-transparent border border-border px-3 py-2 text-sm mt-2" />
              </div>
            </div>

            <div className="border border-border">
              <table className="w-full text-sm">
                <thead className="bg-background/50"><tr className="text-left eyebrow"><th className="p-3">Item</th><th className="p-3">Qty</th><th className="p-3 text-right">Total</th></tr></thead>
                <tbody>
                  {selected.items.map((it: any) => (
                    <tr key={it.id} className="border-t border-border">
                      <td className="p-3"><div className="flex items-center gap-3"><img src={it.product_image} className="w-10 h-12 object-cover bg-surface" alt="" /><div className="font-serif">{it.product_name}</div></div></td>
                      <td className="p-3">{it.quantity}</td>
                      <td className="p-3 text-right">{formatMoney(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(selected.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatMoney(selected.shipping_cost)}</span></div>
              {Number(selected.discount) > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>−{formatMoney(selected.discount)}</span></div>}
              <div className="flex justify-between text-lg pt-2 border-t border-border mt-2"><span>Total</span><span className="text-primary">{formatMoney(selected.total)}</span></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
