import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/site-header";
import { ProductCard } from "@/components/site/product-card";
import { useEffect, useState } from "react";
import { effectivePrice, formatMoney, discountPct } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import { Heart, Minus, Plus, Truck, ShieldCheck, RotateCcw, GitCompare } from "lucide-react";
import { toggleCompare, useCompareIds } from "@/hooks/use-compare";
import { ProductQA } from "@/components/site/product-qa";
import { RecentlyViewed } from "@/components/site/recently-viewed";
import { pushRecentlyViewed } from "@/hooks/use-recently-viewed";
import { buildSeoHead } from "@/lib/seo";
import { ProductGallery } from "@/components/site/product-gallery";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("products")
      .select("name,description,short_description,images,meta_title,meta_description,og_title,og_description,og_image,twitter_title,twitter_description,twitter_image,canonical_url")
      .eq("slug", params.slug)
      .eq("status", "active")
      .maybeSingle();
    return data;
  },
  head: ({ params, loaderData }) => {
    const p = loaderData as any;
    return buildSeoHead({
      title: p?.meta_title || (p?.name ? `${p.name} | AURELIA` : `${params.slug} | AURELIA`),
      description: p?.short_description || p?.description || null,
      path: `/product/${params.slug}`,
      image: p?.images?.[0] || null,
      type: "product",
      seo: p,
    });
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { add } = useCart();
  const { user } = useSession();
  const [qty, setQty] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(name, slug), brands(name, slug)")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (!data) throw notFound();
      return data;
    },
  });

  const { data: related } = useQuery({
    queryKey: ["related", product?.category_id],
    enabled: !!product?.category_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,slug,price,sale_price,images,stock")
        .eq("status", "active")
        .eq("category_id", product!.category_id!)
        .neq("id", product!.id)
        .limit(4);
      return data ?? [];
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", product?.id],
    enabled: !!product?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", product!.id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      const rows = data ?? [];
      const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
        return rows.map((r: any) => ({ ...r, profiles: map.get(r.user_id) ?? null }));
      }
      return rows;
    },
  });


  useEffect(() => { if (product?.id) pushRecentlyViewed(product.id); }, [product?.id]);
  const compareIds = useCompareIds();

  if (isLoading) return <SiteShell><div className="container-luxe py-24 text-muted-foreground">Loading…</div></SiteShell>;
  if (!product) return <SiteShell><div className="container-luxe py-24">Not found.</div></SiteShell>;

  const price = effectivePrice(product);
  const off = discountPct(product);
  const images = product.images?.length ? product.images : ["https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=1000"];


  const addToWishlist = async () => {
    if (!user) { toast.error("Sign in to save."); return; }
    const { error } = await supabase.from("wishlists").insert({ user_id: user.id, product_id: product.id });
    if (error && !error.message.includes("duplicate")) toast.error(error.message);
    else toast.success("Saved to wishlist");
  };

  return (
    <SiteShell>
      <div className="container-luxe py-10">
        <nav className="text-xs uppercase tracking-[0.2em] text-muted-foreground flex gap-2 mb-8">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary">Shop</Link>
          {product.categories && (
            <>
              <span>/</span>
              <Link to="/category/$slug" params={{ slug: product.categories.slug }} className="hover:text-primary">{product.categories.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <ProductGallery urls={images} alt={product.name} />
          </div>

          <div>
            {product.brands && <div className="eyebrow mb-3">{product.brands.name}</div>}
            <h1 className="text-4xl md:text-5xl font-serif">{product.name}</h1>
            <div className="mt-4 flex items-baseline gap-3">
              <div className="text-2xl text-primary">{formatMoney(price)}</div>
              {off > 0 && (
                <>
                  <div className="text-muted-foreground line-through">{formatMoney(product.price)}</div>
                  <div className="text-xs uppercase tracking-[0.2em] bg-primary/10 text-primary px-2 py-1">−{off}%</div>
                </>
              )}
            </div>

            {product.short_description && <p className="mt-6 text-muted-foreground leading-relaxed">{product.short_description}</p>}

            <div className="mt-8 flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
              <span className={product.stock > 0 ? "text-primary" : "text-destructive"}>
                {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
              </span>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center border border-border">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-3 hover:text-primary"><Minus size={14} /></button>
                <span className="px-4 min-w-[3rem] text-center">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-4 py-3 hover:text-primary"><Plus size={14} /></button>
              </div>
              <button
                disabled={product.stock <= 0}
                onClick={() => add.mutate({ product_id: product.id, quantity: qty })}
                className="flex-1 border border-primary bg-primary text-primary-foreground py-4 text-xs uppercase tracking-[0.24em] hover:bg-transparent hover:text-primary transition disabled:opacity-40"
              >
                Add to Bag
              </button>
              <button onClick={addToWishlist} className="border border-border p-4 hover:border-primary hover:text-primary transition" aria-label="Wishlist">
                <Heart size={16} />
              </button>
              <button onClick={() => { toggleCompare(product.id); toast.success(compareIds.includes(product.id) ? "Removed from compare" : "Added to compare"); }} className={`border p-4 transition ${compareIds.includes(product.id) ? "border-primary text-primary" : "border-border hover:border-primary hover:text-primary"}`} aria-label="Compare">
                <GitCompare size={16} />
              </button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 text-xs">
              <div className="text-center border-t border-border pt-4">
                <Truck size={16} className="mx-auto text-primary mb-2" />
                <div className="uppercase tracking-[0.2em]">Free Shipping</div>
              </div>
              <div className="text-center border-t border-border pt-4">
                <ShieldCheck size={16} className="mx-auto text-primary mb-2" />
                <div className="uppercase tracking-[0.2em]">Authentic</div>
              </div>
              <div className="text-center border-t border-border pt-4">
                <RotateCcw size={16} className="mx-auto text-primary mb-2" />
                <div className="uppercase tracking-[0.2em]">30-day Returns</div>
              </div>
            </div>

            {product.description && (
              <div className="mt-10 border-t border-border pt-8">
                <div className="eyebrow mb-3">Details</div>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <section className="mt-24">
          <div className="eyebrow mb-2">The Word</div>
          <h2 className="text-3xl font-serif mb-8">Reviews ({reviews?.length ?? 0})</h2>
          {reviews?.length ? (
            <div className="grid md:grid-cols-2 gap-8">
              {reviews.map((r: any) => (
                <div key={r.id} className="border border-border p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-primary">{"★".repeat(r.rating)}<span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span></span>
                    <span className="text-xs text-muted-foreground">— {r.profiles?.full_name ?? "Verified"}</span>
                  </div>
                  {r.title && <div className="font-serif text-lg mb-1">{r.title}</div>}
                  {r.body && <p className="text-sm text-muted-foreground">{r.body}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No reviews yet.</p>
          )}
        </section>

        {related && related.length > 0 && (
          <section className="mt-24">
            <div className="eyebrow mb-2">You may also like</div>
            <h2 className="text-3xl font-serif mb-8">Complete the look</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        <ProductQA productId={product.id} />
        <RecentlyViewed excludeId={product.id} />
      </div>
    </SiteShell>
  );
}
