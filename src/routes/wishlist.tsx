import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ProductCard } from "@/components/site/product-card";

export const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
  head: () => ({ meta: [{ title: "Wishlist — Aurelia" }], links: [{ rel: "canonical", href: "/wishlist" }] }),
});

function WishlistPage() {
  const { session } = useSession();
  const { data } = useQuery({
    queryKey: ["wishlist", session?.user.id],
    enabled: !!session,
    queryFn: async () => (await supabase.from("wishlists").select("product_id, products(*)").eq("user_id", session!.user.id)).data ?? [],
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-6 py-16">
        <div className="eyebrow mb-3">Saved</div>
        <h1 className="text-5xl font-serif mb-10">Your Wishlist</h1>
        {!session ? (
          <p className="text-muted-foreground">Please <Link to="/auth" className="underline">sign in</Link> to view your wishlist.</p>
        ) : !data?.length ? (
          <p className="text-muted-foreground">Nothing saved yet. <Link to="/shop" className="underline">Browse the shop</Link>.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {data.map((w: any) => w.products && <ProductCard key={w.product_id} product={w.products} />)}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
