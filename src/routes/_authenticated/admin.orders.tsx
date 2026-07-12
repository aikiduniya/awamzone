import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
import { updateOrderStatus, createShipment, refundOrder } from "@/lib/orders.functions";
import { PaginationBar } from "@/components/admin/pagination-bar";

const STATUSES = ["pending","confirmed","processing","packed","shipped","delivered","cancelled","returned","refunded"] as const;
const PAYMENT_STATUSES = ["pending","paid","failed","refunded","partial_refund"] as const;

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersAdmin,
});

function OrdersAdmin() {
  const [status, setStatus] = useState<string>("all");
  const [paymentStatus, setPaymentStatus] = useState<string>("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortCol, setSortCol] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const updateStatusFn = useServerFn(updateOrderStatus);
  const createShipmentFn = useServerFn(createShipment);
  const refundFn = useServerFn(refundOrder);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, refetch, isLoading, isFetching } = useQuery({
    queryKey: ["admin-orders", status, paymentStatus, debouncedQ, page, pageSize, sortCol, sortAsc, dateFrom, dateTo],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let q2 = supabase.from("orders").select("*", { count: "exact" }).order(sortCol, { ascending: sortAsc }).range(from, to);
      if (status !== "all") q2 = q2.eq("status", status as any);
      if (paymentStatus !== "all") q2 = q2.eq("payment_status", paymentStatus as any);
      if (debouncedQ) q2 = q2.or(`order_number.ilike.%${debouncedQ}%,email.ilike.%${debouncedQ}%`);
      if (dateFrom) q2 = q2.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) q2 = q2.lte("created_at", `${dateTo}T23:59:59`);
      const { data: rows, count } = await q2;
      return { rows: rows ?? [], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;

  const toggleSort = (key: string) => {
    if (sortCol === key) setSortAsc((v) => !v);
    else { setSortCol(key); setSortAsc(true); }
    setPage(1);
  };

  const openOrder = async (id: string) => {
    const [orderRes, itemsRes, eventsRes, shipmentsRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", id).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", id),
      supabase.from("order_events").select("*").eq("order_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("shipments").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    ]);
    setSelected({ ...orderRes.data, items: itemsRes.data ?? [], events: eventsRes.data ?? [], shipments: shipmentsRes.data ?? [] });
  };

  const changeStatus = async (newStatus: string) => {
    setBusy(true);
    try {
      await updateStatusFn({ data: { order_id: selected.id, status: newStatus as any, note: "" } });
      toast.success("Order updated");
      await refetch(); await openOrder(selected.id);
    } catch (e: any) { toast.error(e?.message ?? "Update failed"); }
    finally { setBusy(false); }
  };

  const addShipment = async (form: FormData) => {
    setBusy(true);
    try {
      await createShipmentFn({
        data: {
          order_id: selected.id,
          carrier: String(form.get("carrier") ?? ""),
          tracking_number: String(form.get("tracking_number") ?? ""),
          tracking_url: String(form.get("tracking_url") ?? ""),
          notes: String(form.get("notes") ?? ""),
          mark_shipped: form.get("mark_shipped") === "on",
        },
      });
      toast.success("Shipment recorded");
      await refetch(); await openOrder(selected.id);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  const doRefund = async (form: FormData) => {
    setBusy(true);
    try {
      await refundFn({
        data: {
          order_id: selected.id,
          amount: Number(form.get("amount") ?? 0),
          reason: String(form.get("reason") ?? ""),
          restock: form.get("restock") === "on",
        },
      });
      toast.success("Refund recorded");
      await refetch(); await openOrder(selected.id);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  const th = (label: string, key: string) => {
    const active = sortCol === key;
    return (
      <th className="p-4">
        <button onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 eyebrow hover:text-foreground">
          {label}
          {active ? (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-40" />}
        </button>
      </th>
    );
  };

  return (
    <>
      <div className="flex flex-wrap gap-4 items-end justify-between mb-6">
        <div><div className="eyebrow mb-2">Sales</div><h1 className="text-4xl font-serif">Orders</h1></div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 border border-border rounded px-3 py-2 flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order # or email…" className="flex-1 bg-transparent text-sm focus:outline-none" />
          {q && <button onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>}
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-10 rounded border border-border bg-transparent px-3 text-sm">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="h-10 rounded border border-border bg-transparent px-3 text-sm">
          <option value="all">All payments</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-10 rounded border border-border bg-transparent px-2 text-sm" />
        <span className="text-xs text-muted-foreground">→</span>
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-10 rounded border border-border bg-transparent px-2 text-sm" />
        {isFetching && <span className="text-xs text-muted-foreground">Loading…</span>}
      </div>

      <div className="border border-border rounded">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No orders match this filter.</div>
          ) : (
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-surface">
                <tr className="text-left">
                  {th("Order", "order_number")}
                  {th("Date", "created_at")}
                  {th("Customer", "email")}
                  {th("Status", "status")}
                  {th("Payment", "payment_status")}
                  {th("Total", "total")}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((o: any) => (
                  <tr key={o.id} className="border-t border-border hover:bg-secondary/40">
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
          )}
        </div>
        <PaginationBar page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      </div>

      {selected && (
        <div className="fixed inset-0 bg-background/85 backdrop-blur z-50 overflow-auto p-4" onClick={() => setSelected(null)}>
          <div className="bg-surface border border-border max-w-4xl mx-auto p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="eyebrow mb-1">Order</div>
                <h2 className="text-3xl font-serif text-primary">{selected.order_number}</h2>
                <div className="text-sm text-muted-foreground mt-1">{new Date(selected.created_at).toLocaleString()}</div>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close"><X /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="border border-border p-4">
                <div className="eyebrow mb-2">Customer</div>
                <div className="text-sm">{selected.email}</div>
                {selected.shipping_address && (
                  <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {selected.shipping_address.full_name}<br />
                    {selected.shipping_address.line1}
                    {selected.shipping_address.line2 && <>, {selected.shipping_address.line2}</>}<br />
                    {selected.shipping_address.city}, {selected.shipping_address.state} {selected.shipping_address.postal_code}<br />
                    {selected.shipping_address.country}
                    {selected.shipping_address.phone && <><br />☎ {selected.shipping_address.phone}</>}
                  </div>
                )}
              </div>
              <div className="border border-border p-4">
                <div className="eyebrow mb-2">Status</div>
                <select disabled={busy} value={selected.status} onChange={(e) => changeStatus(e.target.value)} className="w-full bg-transparent border border-border px-3 py-2 text-sm">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="mt-2 text-xs text-muted-foreground">
                  Payment: {selected.payment_status} ({selected.payment_method})
                  {Number(selected.refunded_amount) > 0 && ` — refunded ${formatMoney(selected.refunded_amount)}`}
                </div>
              </div>
            </div>

            <div className="border border-border overflow-x-auto mb-6">
              <table className="w-full text-sm min-w-[420px]">
                <thead className="bg-background/50"><tr className="text-left eyebrow"><th className="p-3">Item</th><th className="p-3">Qty</th><th className="p-3 text-right">Total</th></tr></thead>
                <tbody>
                  {selected.items.map((it: any) => (
                    <tr key={it.id} className="border-t border-border">
                      <td className="p-3"><div className="flex items-center gap-3"><img loading="lazy" src={it.product_image ?? ""} className="w-10 h-12 object-cover bg-surface" alt="" /><div className="font-serif">{it.product_name}</div></div></td>
                      <td className="p-3">{it.quantity}</td>
                      <td className="p-3 text-right">{formatMoney(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <form onSubmit={(e) => { e.preventDefault(); addShipment(new FormData(e.currentTarget)); }} className="border border-border p-4 space-y-2">
                <div className="eyebrow mb-2">Add shipment</div>
                <input name="carrier" placeholder="Carrier (DHL, FedEx…)" className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
                <input name="tracking_number" placeholder="Tracking number" className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
                <input name="tracking_url" type="url" placeholder="Tracking URL (optional)" className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
                <textarea name="notes" placeholder="Notes" rows={2} className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="mark_shipped" defaultChecked /> Mark order as shipped</label>
                <button disabled={busy} className="w-full border border-primary bg-primary text-primary-foreground px-3 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50">Create shipment</button>
              </form>

              <form onSubmit={(e) => { e.preventDefault(); doRefund(new FormData(e.currentTarget)); }} className="border border-border p-4 space-y-2">
                <div className="eyebrow mb-2">Issue refund</div>
                <input name="amount" required type="number" step="0.01" min="0" max={selected.total}
                       defaultValue={Math.max(0, Number(selected.total) - Number(selected.refunded_amount ?? 0)).toFixed(2)}
                       placeholder="Amount" className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
                <textarea name="reason" placeholder="Reason (optional)" rows={2} className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="restock" /> Restock items</label>
                <button disabled={busy} className="w-full border border-primary text-primary px-3 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50">Record refund</button>
                <div className="text-[10px] text-muted-foreground">Note: this records the refund. Provider capture must be initiated in your payment dashboard until Stripe/PayPal are wired.</div>
              </form>
            </div>

            {selected.shipments?.length > 0 && (
              <div className="border border-border p-4 mb-6">
                <div className="eyebrow mb-2">Shipments</div>
                <ul className="text-xs space-y-1">
                  {selected.shipments.map((s: any) => (
                    <li key={s.id}>
                      <span className="text-primary">{s.status}</span> · {s.carrier ?? "—"} · {s.tracking_number ?? "no tracking"}
                      {s.tracking_url && <> · <a href={s.tracking_url} target="_blank" rel="noreferrer" className="underline">track</a></>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border border-border p-4">
              <div className="eyebrow mb-2">Timeline</div>
              <ul className="text-xs space-y-1">
                {selected.events.map((ev: any) => (
                  <li key={ev.id}><span className="text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</span> — {ev.message ?? ev.event_type}</li>
                ))}
              </ul>
            </div>

            <div className="mt-6 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(selected.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatMoney(selected.shipping_cost)}</span></div>
              {Number(selected.tax) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(selected.tax)}</span></div>}
              {Number(selected.discount) > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>−{formatMoney(selected.discount)}</span></div>}
              <div className="flex justify-between text-lg pt-2 border-t border-border mt-2"><span>Total</span><span className="text-primary">{formatMoney(selected.total)}</span></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
