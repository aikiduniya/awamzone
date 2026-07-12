import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/site-header";
import { ProductCard } from "@/components/site/product-card";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("categories")
      .select("name,description,image_url,banner_url,meta_title,meta_description,og_title,og_description,og_image,twitter_title,twitter_description,twitter_image,canonical_url")
      .eq("slug", params.slug)
      .eq("is_active", true)
      .maybeSingle();
    return data;
  },
  head: ({ params, loaderData }) => {
    const c = loaderData as any;
    return buildSeoHead({
      title: c?.meta_title || (c?.name ? `${c.name} | AURELIA` : `${params.slug} | AURELIA`),
      description: c?.description || null,
      path: `/category/${params.slug}`,
      image: c?.banner_url || c?.image_url || null,
      seo: c,
    });
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const cat = (await supabase.from("categories").select("*").eq("slug", slug).eq("is_active", true).maybeSingle()).data;
      if (!cat) return { cat: null, products: [] };
      const { data: products } = await supabase.from("products").select("id,name,slug,price,sale_price,images,stock").eq("status", "active").eq("category_id", cat.id).order("created_at", { ascending: false });
      return { cat, products: products ?? [] };
    },
  });

  if (!data?.cat) return <SiteShell><div className="container-luxe py-24">Category not found.</div></SiteShell>;

  return (
    <SiteShell>
      <div className="relative h-[45vh] min-h-[320px] overflow-hidden">
        <img src={data.cat.banner_url ?? data.cat.image_url ?? ""} alt={data.cat.name} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/20" />
        <div className="container-luxe relative z-10 h-full flex items-end pb-12">
          <div>
            <nav className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
              <Link to="/shop" className="hover:text-primary">Shop</Link> / <span className="text-foreground">{data.cat.name}</span>
            </nav>
            <h1 className="text-5xl md:text-6xl font-serif">{data.cat.name}</h1>
            {data.cat.description && <p className="mt-4 max-w-xl text-muted-foreground">{data.cat.description}</p>}
          </div>
        </div>
      </div>

      <div className="container-luxe py-16">
        {data.products.length ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {data.products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground">No products in this category yet.</div>
        )}
      </div>
    </SiteShell>
  );
}
