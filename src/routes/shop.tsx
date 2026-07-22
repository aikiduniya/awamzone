import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/site-header";
import { ProductCard } from "@/components/site/product-card";
import { useState } from "react";

type Search = { q?: string; category?: string; brand?: string; sort?: string; min?: number; max?: number };

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    brand: typeof s.brand === "string" ? s.brand : undefined,
    sort: typeof s.sort === "string" ? s.sort : "new",
    min: s.min != null ? Number(s.min) : undefined,
    max: s.max != null ? Number(s.max) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop | AURELIA" },
      { name: "description", content: "Shop the AURELIA collection — curated luxury physical goods." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(search.q ?? "");

  const { data: cats } = useQuery({
    queryKey: ["shop-cats"],
    queryFn: async () => (await supabase.from("categories").select("id,name,slug").eq("is_active", true).order("sort_order")).data ?? [],
  });
  const { data: brands } = useQuery({
    queryKey: ["shop-brands"],
    queryFn: async () => (await supabase.from("brands").select("id,name,slug").eq("is_active", true).order("sort_order")).data ?? [],
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["shop-products", search],
    queryFn: async () => {
      let query = supabase.from("products").select("id,name,slug,price,sale_price,images,stock,category_id,brand_id").eq("status", "active");
      if (search.q) query = query.ilike("name", `%${search.q}%`);
      if (search.category) {
        const cat = (await supabase.from("categories").select("id").eq("slug", search.category).maybeSingle()).data;
        if (cat) query = query.eq("category_id", cat.id);
      }
      if (search.brand) {
        const br = (await supabase.from("brands").select("id").eq("slug", search.brand).maybeSingle()).data;
        if (br) query = query.eq("brand_id", br.id);
      }
      if (search.min) query = query.gte("price", search.min);
      if (search.max) query = query.lte("price", search.max);

      switch (search.sort) {
        case "price_asc": query = query.order("price", { ascending: true }); break;
        case "price_desc": query = query.order("price", { ascending: false }); break;
        case "name_asc": query = query.order("name", { ascending: true }); break;
        case "best": query = query.order("sales_count", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false }); break;
      }
      const { data } = await query;
      return data ?? [];
    },
  });

  const update = (patch: Partial<Search>) => navigate({ search: (p: Search) => ({ ...p, ...patch }) as any });

  return (
    <SiteShell>
      <div className="container-luxe py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">Collection</div>
            <h1 className="text-5xl font-serif">Shop All</h1>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update({ q });
            }}
            className="flex items-center gap-2 border-b border-border w-full md:w-80"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              className="flex-1 bg-transparent py-2 text-sm focus:outline-none"
            />
            <button className="text-xs uppercase tracking-[0.24em] text-primary">Search</button>
          </form>
        </div>

        <div className="mt-10 grid grid-cols-12 gap-10">
          <aside className="col-span-12 md:col-span-3">
            <div className="md:sticky md:top-28 space-y-8 bg-card/40 border border-border rounded-lg p-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="eyebrow">Category</div>
                  {search.category && (
                    <button onClick={() => update({ category: undefined })} className="text-[10px] uppercase tracking-[0.2em] text-primary hover:underline">Clear</button>
                  )}
                </div>
                <ul className="space-y-1 text-sm">
                  <li>
                    <button
                      onClick={() => update({ category: undefined })}
                      className={`w-full text-left px-3 py-2 rounded transition ${!search.category ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}
                    >
                      All categories
                    </button>
                  </li>
                  {cats?.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => update({ category: c.slug })}
                        className={`w-full text-left px-3 py-2 rounded transition flex items-center justify-between ${search.category === c.slug ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}
                      >
                        <span>{c.name}</span>
                        {search.category === c.slug && <span className="text-xs">✓</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="h-px bg-border" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="eyebrow">Brand</div>
                  {search.brand && (
                    <button onClick={() => update({ brand: undefined })} className="text-[10px] uppercase tracking-[0.2em] text-primary hover:underline">Clear</button>
                  )}
                </div>
                <ul className="space-y-1 text-sm max-h-64 overflow-y-auto pr-1">
                  <li>
                    <button
                      onClick={() => update({ brand: undefined })}
                      className={`w-full text-left px-3 py-2 rounded transition ${!search.brand ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}
                    >
                      All brands
                    </button>
                  </li>
                  {brands?.map((b) => (
                    <li key={b.id}>
                      <button
                        onClick={() => update({ brand: b.slug })}
                        className={`w-full text-left px-3 py-2 rounded transition ${search.brand === b.slug ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}
                      >
                        {b.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="h-px bg-border" />

              <div>
                <div className="eyebrow mb-4">Price (PKR)</div>
                <div className="flex gap-2">
                  <input type="number" defaultValue={search.min ?? ""} placeholder="Min" onBlur={(e) => update({ min: e.target.value ? Number(e.target.value) : undefined })} className="w-full border border-border bg-background rounded px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  <input type="number" defaultValue={search.max ?? ""} placeholder="Max" onBlur={(e) => update({ max: e.target.value ? Number(e.target.value) : undefined })} className="w-full border border-border bg-background rounded px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>

              {(search.category || search.brand || search.min || search.max || search.q) && (
                <button
                  onClick={() => navigate({ search: {} as any })}
                  className="w-full border border-primary text-primary text-xs uppercase tracking-[0.2em] py-2 rounded hover:bg-primary hover:text-primary-foreground transition"
                >
                  Reset all filters
                </button>
              )}
            </div>
          </aside>


          <div className="col-span-12 md:col-span-9">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-8">
              <div className="text-xs text-muted-foreground uppercase tracking-[0.2em]">{products?.length ?? 0} results</div>
              <select
                value={search.sort ?? "new"}
                onChange={(e) => update({ sort: e.target.value })}
                className="bg-transparent text-xs uppercase tracking-[0.2em] focus:outline-none"
              >
                <option value="new">Newest</option>
                <option value="best">Best selling</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
                <option value="name_asc">A–Z</option>
              </select>
            </div>
            {isLoading ? (
              <div className="text-muted-foreground">Loading…</div>
            ) : products?.length ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <div className="py-20 text-center text-muted-foreground">No products found.</div>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
