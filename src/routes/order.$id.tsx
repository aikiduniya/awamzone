import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/site-header";
import { formatMoney } from "@/lib/format";
import { useSession } from "@/hooks/use-session";
import { useState } from "react";
import { toast } from "sonner";
import { createReturnRequest } from "@/lib/orders.functions";

export const Route = createFileRoute("/order/$id")({
  head: () => ({ meta: [{ title: "Order confirmed | AURELIA" }, { name: "robots", content: "noindex" }] }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const [showReturn, setShowReturn] = useState(false);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const createReturnFn = useServerFn(createReturnRequest);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const [orderRes, itemsRes, eventsRes, shipmentsRes, returnRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
        supabase.from("order_events").select("*").eq("order_id", id).order("created_at", { ascending: true }),
        supabase.from("shipments").select("*").eq("order_id", id).order("created_at", { ascending: false }),
        supabase.from("return_requests").select("*").eq("order_id", id).order("created_at", { ascending: false }),
      ]);
      return {
        order: orderRes.data, items: itemsRes.data ?? [], events: eventsRes.data ?? [],
        shipments: shipmentsRes.data ?? [], returns: returnRes.data ?? [],
      };
    },
  });

  const submitReturn = async () => {
    if (!reason.trim()) return toast.error("Please describe the reason for return");
    const items = Object.entries(selected)
      .filter(([, q]) => q > 0)
      .map(([order_item_id, quantity]) => ({ order_item_id, quantity: Number(quantity) }));
    if (items.length === 0) return toast.error("Select at least one item");
    setSubmitting(true);
    try {
      await createReturnFn({ data: { order_id: id, reason, items } });
      toast.success("Return request submitted — we'll review it shortly");
      setShowReturn(false); setReason(""); setSelected({});
      await refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't submit return");
    } finally { setSubmitting(false); }
  };

  if (isLoading) return <SiteShell><div className="container-luxe py-20 text-sm text-muted-foreground">Loading order…</div></SiteShell>;
  if (!data?.order) return <SiteShell><div className="container-luxe py-20"><h1 className="text-3xl font-serif">Order not found</h1></div></SiteShell>;

  const order = data.order as any;
  const canReturn = user && order.user_id === user.id && ["delivered", "shipped"].includes(order.status);
  const hasReturn = data.returns.length > 0;

  return (
    <SiteShell>
      <div className="container-luxe py-16 md:py-20 max-w-3xl">
        <div className="eyebrow mb-2 text-primary">Thank you</div>
        <h1 className="text-4xl md:text-5xl font-serif mb-3">Order Confirmed</h1>
        <p className="text-muted-foreground">Order #{order.order_number} · <span className="uppercase tracking-[0.2em] text-xs">{order.status}</span></p>
        <div className="mt-4">
          <Link to="/invoice/$orderId" params={{ orderId: order.id }} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary border border-primary px-4 py-2 hover:bg-primary hover:text-primary-foreground transition">
            Download invoice
          </Link>
        </div>

        <div className="mt-10 border border-border p-6">
          <div className="space-y-3 mb-6">
            {data.items.map((it: any) => (
              <div key={it.id} className="flex gap-3 text-sm">
                <img loading="lazy" src={it.product_image ?? ""} alt={it.product_name} className="w-14 h-16 object-cover bg-surface" />
                <div className="flex-1"><div className="font-serif">{it.product_name}</div><div className="text-xs text-muted-foreground">Qty {it.quantity}</div></div>
                <div>{formatMoney(it.total)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatMoney(order.shipping_cost)}</span></div>
            {Number(order.tax) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(order.tax)}</span></div>}
            {Number(order.discount) > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>−{formatMoney(order.discount)}</span></div>}
            <div className="flex justify-between text-lg pt-2 border-t border-border"><span>Total</span><span className="text-primary">{formatMoney(order.total)}</span></div>
          </div>
        </div>

        {data.shipments.length > 0 && (
          <div className="mt-6 border border-border p-6">
            <div className="eyebrow mb-3">Shipment</div>
            {data.shipments.map((s: any) => (
              <div key={s.id} className="text-sm">
                <div className="text-primary uppercase tracking-[0.2em] text-xs">{s.status}</div>
                <div>{s.carrier ?? "—"} · {s.tracking_number ?? "tracking pending"}</div>
                {s.tracking_url && <a href={s.tracking_url} target="_blank" rel="noreferrer" className="underline text-primary text-xs">Track parcel</a>}
              </div>
            ))}
          </div>
        )}

        {data.events.length > 0 && (
          <div className="mt-6 border border-border p-6">
            <div className="eyebrow mb-3">Timeline</div>
            <ul className="text-xs space-y-1">
              {data.events.map((ev: any) => (
                <li key={ev.id}><span className="text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</span> — {ev.message ?? ev.event_type}</li>
              ))}
            </ul>
          </div>
        )}

        {canReturn && !hasReturn && (
          <div className="mt-6">
            {!showReturn ? (
              <button onClick={() => setShowReturn(true)} className="border border-primary text-primary px-6 py-3 text-xs uppercase tracking-[0.24em] hover:bg-primary hover:text-primary-foreground transition">Request return</button>
            ) : (
              <div className="border border-border p-6 space-y-4">
                <h2 className="text-xl font-serif">Request a return</h2>
                <div className="space-y-2">
                  {data.items.map((it: any) => (
                    <label key={it.id} className="flex items-center justify-between text-sm">
                      <span>{it.product_name}</span>
                      <input type="number" min={0} max={it.quantity} defaultValue={0}
                             onChange={(e) => setSelected({ ...selected, [it.id]: Number(e.target.value) })}
                             className="w-20 bg-transparent border border-border px-2 py-1 text-sm" />
                    </label>
                  ))}
                </div>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                          placeholder="Please describe the reason for return (defective, wrong item, changed mind, etc.)"
                          className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
                <div className="flex gap-3">
                  <button onClick={submitReturn} disabled={submitting} className="border border-primary bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.24em] disabled:opacity-50">
                    {submitting ? "Submitting…" : "Submit request"}
                  </button>
                  <button onClick={() => setShowReturn(false)} type="button" className="border border-border px-6 py-3 text-xs uppercase tracking-[0.24em]">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {hasReturn && (
          <div className="mt-6 border border-border p-6">
            <div className="eyebrow mb-2">Return status</div>
            {data.returns.map((r: any) => (
              <div key={r.id} className="text-sm">
                <div className="uppercase tracking-[0.2em] text-xs text-primary">{r.status}</div>
                <div className="text-xs text-muted-foreground mt-1">Requested {new Date(r.created_at).toLocaleDateString()}</div>
                {r.admin_notes && <div className="text-xs mt-2">{r.admin_notes}</div>}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-4">
          <Link to="/shop" className="border border-primary bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.24em]">Keep shopping</Link>
          <Link to="/account" className="border border-border px-6 py-3 text-xs uppercase tracking-[0.24em] hover:border-primary hover:text-primary">View orders</Link>
        </div>
      </div>
    </SiteShell>
  );
}
