import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const Route = createFileRoute("/blog")({
  component: BlogIndex,
  head: () => ({
    meta: [
      { title: "Journal — Aurelia" },
      { name: "description", content: "Stories, guides, and news from our team." },
      { property: "og:title", content: "Journal — Aurelia" },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
});

function BlogIndex() {
  const { data: posts } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => (await supabase.from("blog_posts").select("*, blog_categories(name, slug)").eq("is_published", true).order("published_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-6 py-16 max-w-5xl">
        <div className="eyebrow mb-3">Journal</div>
        <h1 className="text-5xl font-serif mb-12">Stories & Guides</h1>
        {!posts?.length ? (
          <p className="text-muted-foreground">No articles yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {posts.map((p: any) => (
              <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="group">
                {p.cover_image && <div className="aspect-[4/3] overflow-hidden mb-4"><img src={p.cover_image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition" /></div>}
                {p.blog_categories?.name && <div className="eyebrow mb-2">{p.blog_categories.name}</div>}
                <h2 className="font-serif text-2xl mb-2 group-hover:text-primary transition">{p.title}</h2>
                <p className="text-sm text-muted-foreground">{p.excerpt}</p>
                {p.published_at && <div className="text-xs text-muted-foreground mt-3">{new Date(p.published_at).toLocaleDateString()}</div>}
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
