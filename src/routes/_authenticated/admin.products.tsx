import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsList,
});

function ProductsList() {
  const [q, setQ] = useState("");
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin-products", q],
    queryFn: async () => {
      let query = supabase.from("products").select("id,name,slug,sku,price,sale_price,stock,status,images,categories(name),brands(name)").order("created_at", { ascending: false });
      if (q) query = query.ilike("name", `%${q}%`);
      return (await query).data ?? [];
    },
  });

  const remove = async (id: string) => {
    if (!confirm("Delete product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); refetch(); }
  };

  return (
    <>
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="eyebrow mb-2">Catalog</div>
          <h1 className="text-4xl font-serif">Products</h1>
        </div>
        <Link to="/admin/products/$id" params={{ id: "new" }} className="inline-flex items-center gap-2 border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]">
          <Plus size={14} /> New Product
        </Link>
      </div>

      <div className="flex items-center gap-2 border border-border px-3 py-2 mb-6 max-w-md">
        <Search size={14} className="text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="flex-1 bg-transparent text-sm focus:outline-none" />
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface">
            <tr className="text-left eyebrow">
              <th className="p-4">Product</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Category</th>
              <th className="p-4 text-right">Price</th>
              <th className="p-4 text-right">Stock</th>
              <th className="p-4">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : data?.length ? data.map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={p.images?.[0]} alt="" className="w-10 h-12 object-cover bg-surface" />
                    <div>
                      <div className="font-serif">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.brands?.name}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground font-mono text-xs">{p.sku}</td>
                <td className="p-4 text-muted-foreground">{p.categories?.name}</td>
                <td className="p-4 text-right">{formatMoney(p.sale_price ?? p.price)}</td>
                <td className="p-4 text-right">{p.stock}</td>
                <td className="p-4 text-xs uppercase tracking-[0.2em]">{p.status}</td>
                <td className="p-4 text-right space-x-3">
                  <Link to="/admin/products/$id" params={{ id: p.id }} className="text-primary text-xs uppercase tracking-[0.2em]">Edit</Link>
                  <button onClick={() => remove(p.id)} className="text-destructive text-xs uppercase tracking-[0.2em]">Delete</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No products.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
