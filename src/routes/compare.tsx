import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { useCompareIds, removeCompare } from "@/hooks/use-compare";
import { formatMoney } from "@/lib/format";
import { X } from "lucide-react";

export const Route = createFileRoute("/compare")({
  component: ComparePage,
  head: () => ({ meta: [{ title: "Compare — Aurelia" }], links: [{ rel: "canonical", href: "/compare" }] }),
});

function ComparePage() {
  const ids = useCompareIds();
  const { data: products } = useQuery({
    queryKey: ["compare", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => (await supabase.from("products").select("*").in("id", ids)).data ?? [],
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-6 py-16">
        <div className="eyebrow mb-3">Comparison</div>
        <h1 className="text-5xl font-serif mb-10">Compare Products</h1>
        {!ids.length ? (
          <p className="text-muted-foreground">No products in comparison. <Link to="/shop" className="underline">Add some from the shop</Link>.</p>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="p-4 text-left">Feature</th>
                  {products?.map((p) => (
                    <th key={p.id} className="p-4 text-left min-w-[220px]">
                      <div className="flex justify-between items-start">
                        <Link to="/product/$slug" params={{ slug: p.slug }} className="font-serif text-lg hover:text-primary">{p.name}</Link>
                        <button onClick={() => removeCompare(p.id)}><X size={16} /></button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border"><td className="p-4 eyebrow">Image</td>
                  {products?.map((p) => {
                    const img = Array.isArray(p.images) ? (p.images[0] as string | undefined) : undefined;
                    return <td key={p.id} className="p-4">{img && <img src={img} alt="" className="w-32 h-32 object-cover" />}</td>;
                  })}
                </tr>
                <tr className="border-t border-border"><td className="p-4 eyebrow">Price</td>
                  {products?.map((p) => <td key={p.id} className="p-4 font-serif text-lg">{formatMoney(p.sale_price ?? p.price)}</td>)}
                </tr>
                <tr className="border-t border-border"><td className="p-4 eyebrow">Description</td>
                  {products?.map((p) => <td key={p.id} className="p-4 text-muted-foreground">{p.short_description || p.description || "—"}</td>)}
                </tr>
                <tr className="border-t border-border"><td className="p-4 eyebrow">SKU</td>
                  {products?.map((p) => <td key={p.id} className="p-4 font-mono text-xs">{p.sku || "—"}</td>)}
                </tr>
                <tr className="border-t border-border"><td className="p-4 eyebrow">Stock</td>
                  {products?.map((p) => <td key={p.id} className="p-4">{(p.stock ?? 0) > 0 ? "In stock" : "Out of stock"}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
