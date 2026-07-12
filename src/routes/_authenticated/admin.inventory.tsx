import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertTriangle, PackageX, Package, CheckCircle2, DollarSign, Search, X, ArrowUpDown, Pencil } from "lucide-react";
import { AdminHeader, Empty, IconButton, TableSkeleton, AdminModal, Field } from "@/components/admin/admin-ui";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [adjusting, setAdjusting] = useState<any>(null);
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("manual adjustment");
  const [busy, setBusy] = useState(false);

  const { data: rows, isLoading, refetch } = useQuery({
    queryKey: ["inventory", q, filter],
    queryFn: async () => {
      let query = supabase.from("products").select("id,name,sku,stock,low_stock_threshold,price,status").order("stock", { ascending: true }).limit(200);
      if (q) query = query.ilike("name", `%${q}%`);
      const { data } = await query;
      let r = data ?? [];
      if (filter === "low") r = r.filter((p: any) => p.stock > 0 && p.stock <= (p.low_stock_threshold ?? 5));
      if (filter === "out") r = r.filter((p: any) => p.stock <= 0);
      return r;
    },
  });

  const submitAdjustment = async () => {
    if (!adjusting) return;
    const d = Number(delta);
    if (Number.isNaN(d) || d === 0) return toast.error("Enter a non-zero adjustment");
    setBusy(true);
    try {
      const newStock = Math.max(0, adjusting.stock + d);
      const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", adjusting.id);
      if (error) throw error;
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("stock_movements").insert({
        product_id: adjusting.id, delta: d, reason: reason || "manual", created_by: userData.user?.id ?? null,
      });
      toast.success("Stock updated");
      setAdjusting(null); setDelta("0"); setReason("manual adjustment");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const outCount = rows?.filter((r: any) => r.stock <= 0).length ?? 0;
  const lowCount = rows?.filter((r: any) => r.stock > 0 && r.stock <= (r.low_stock_threshold ?? 5)).length ?? 0;
  const inStockCount = (rows?.length ?? 0) - outCount;
  const totalValue = (rows ?? []).reduce((s: number, r: any) => s + Number(r.price || 0) * Number(r.stock || 0), 0);

  const cards = [
    { label: "Total products", value: rows?.length ?? 0, icon: Package, tone: "text-primary" },
    { label: "In stock", value: inStockCount, icon: CheckCircle2, tone: "text-emerald-500" },
    { label: "Low stock", value: lowCount, icon: AlertTriangle, tone: "text-amber-500" },
    { label: "Out of stock", value: outCount, icon: PackageX, tone: "text-destructive" },
    { label: "Inventory value", value: formatMoney(totalValue), icon: DollarSign, tone: "text-primary" },
  ];

  return (
    <>
      <AdminHeader eyebrow="Warehouse" title="Inventory" description="Track stock levels and record adjustments." />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded border border-border bg-background p-4 transition hover:border-primary/40">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{c.label}</div>
                <Icon size={16} className={c.tone} />
              </div>
              <div className="text-2xl font-serif">{c.value}</div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 border border-border rounded px-3 py-2 flex-1 max-w-md bg-background">
          <Search size={14} className="text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="flex-1 bg-transparent text-sm focus:outline-none" aria-label="Search inventory" />
          {q && <button onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground" aria-label="Clear"><X size={12} /></button>}
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="h-10 rounded border border-border bg-transparent px-3 text-sm">
          <option value="all">All items</option>
          <option value="low">Low stock only</option>
          <option value="out">Out of stock only</option>
        </select>
      </div>

      <div className="border border-border rounded bg-background overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary sticky top-0 z-10">
            <tr className="text-left">
              <th className="p-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Product</th>
              <th className="p-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">SKU</th>
              <th className="p-3 text-right text-xs uppercase tracking-[0.18em] text-muted-foreground">Stock</th>
              <th className="p-3 text-right text-xs uppercase tracking-[0.18em] text-muted-foreground">Threshold</th>
              <th className="p-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</th>
              <th className="p-3 sticky right-0 bg-secondary" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-0"><TableSkeleton cols={5} /></td></tr>
            ) : (rows?.length ?? 0) === 0 ? (
              <tr><td colSpan={6} className="p-0"><Empty>No products match this filter.</Empty></td></tr>
            ) : rows?.map((r: any) => {
              const isOut = r.stock <= 0;
              const isLow = !isOut && r.stock <= (r.low_stock_threshold ?? 5);
              return (
                <tr key={r.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3 text-muted-foreground font-mono text-xs">{r.sku ?? "—"}</td>
                  <td className={`p-3 text-right font-medium ${isOut ? "text-destructive" : isLow ? "text-amber-500" : ""}`}>{r.stock}</td>
                  <td className="p-3 text-right text-muted-foreground">{r.low_stock_threshold ?? 5}</td>
                  <td className="p-3 text-xs uppercase tracking-[0.2em]">
                    {isOut ? <span className="text-destructive">Out</span> : isLow ? <span className="text-amber-500">Low</span> : <span className="text-muted-foreground">OK</span>}
                  </td>
                  <td className="p-3 text-right sticky right-0 bg-background">
                    <IconButton label="Adjust stock" icon={Pencil} variant="primary" onClick={() => { setAdjusting(r); setDelta("0"); setReason("manual adjustment"); }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AdminModal
        open={!!adjusting}
        onClose={() => setAdjusting(null)}
        title="Adjust stock"
        description={adjusting ? `${adjusting.name} — current stock: ${adjusting.stock}` : ""}
        size="md"
      >
        <div className="space-y-4">
          <Field label="Adjustment (use negative to decrease)">
            <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} autoFocus />
          </Field>
          <Field label="Reason">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="manual adjustment" />
          </Field>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setAdjusting(null)} className="flex-1 border border-border py-2.5 text-xs uppercase tracking-[0.24em] hover:bg-secondary">Cancel</button>
            <button disabled={busy} onClick={submitAdjustment} className="flex-[2] border border-primary bg-primary text-primary-foreground py-2.5 text-xs uppercase tracking-[0.24em] disabled:opacity-50">
              {busy ? "Saving…" : "Apply adjustment"}
            </button>
          </div>
        </div>
      </AdminModal>
    </>
  );
}
