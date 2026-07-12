import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertTriangle, PackageX, Package, CheckCircle2, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const { data: rows, refetch } = useQuery({
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

  const adjust = async (productId: string, currentStock: number) => {
    const raw = prompt("Adjust stock by (use negative to decrease):", "0");
    if (!raw) return;
    const delta = Number(raw);
    if (Number.isNaN(delta) || delta === 0) return;
    const reason = prompt("Reason:", "manual adjustment") ?? "manual";
    const newStock = Math.max(0, currentStock + delta);
    const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", productId);
    if (error) return toast.error(error.message);
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("stock_movements").insert({
      product_id: productId, delta, reason, created_by: userData.user?.id ?? null,
    });
    toast.success("Stock updated");
    refetch();
  };

  const outCount = rows?.filter((r: any) => r.stock <= 0).length ?? 0;
  const lowCount = rows?.filter((r: any) => r.stock > 0 && r.stock <= (r.low_stock_threshold ?? 5)).length ?? 0;
  const inStockCount = (rows?.length ?? 0) - outCount;
  const totalValue = (rows ?? []).reduce((s: number, r: any) => s + Number(r.price || 0) * Number(r.stock || 0), 0);

  const cards = [
    { label: "Total products", value: rows?.length ?? 0, icon: Package, tint: "bg-indigo-500" },
    { label: "In stock", value: inStockCount, icon: CheckCircle2, tint: "bg-emerald-500" },
    { label: "Low stock", value: lowCount, icon: AlertTriangle, tint: "bg-amber-500" },
    { label: "Out of stock", value: outCount, icon: PackageX, tint: "bg-rose-500" },
    { label: "Inventory value", value: totalValue.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }), icon: DollarSign, tint: "bg-teal-500" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-primary">Inventory</h1>
        <p className="text-sm text-muted-foreground mt-1">Track stock levels and make adjustments.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20 blur-2xl ${c.tint}`} />
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{c.label}</div>
                <div className={`h-8 w-8 rounded-lg text-white inline-flex items-center justify-center ${c.tint}`}><Icon size={14} /></div>
              </div>
              <div className="text-2xl font-serif">{c.value}</div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mb-4">
        <Input placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="all">All</option>
          <option value="low">Low stock only</option>
          <option value="out">Out of stock only</option>
        </select>
      </div>

      <div className="border border-border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3">Product</th>
              <th className="text-left p-3">SKU</th>
              <th className="text-right p-3">Stock</th>
              <th className="text-right p-3">Threshold</th>
              <th className="text-left p-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((r: any) => {
              const isOut = r.stock <= 0;
              const isLow = !isOut && r.stock <= (r.low_stock_threshold ?? 5);
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3 text-muted-foreground">{r.sku ?? "—"}</td>
                  <td className={`p-3 text-right font-medium ${isOut ? "text-destructive" : isLow ? "text-amber-500" : ""}`}>{r.stock}</td>
                  <td className="p-3 text-right text-muted-foreground">{r.low_stock_threshold ?? 5}</td>
                  <td className="p-3">{isOut ? <span className="text-destructive">Out</span> : isLow ? <span className="text-amber-500">Low</span> : <span className="text-muted-foreground">OK</span>}</td>
                  <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => adjust(r.id, r.stock)}>Adjust</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
