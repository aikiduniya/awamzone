import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPost,
  errorComponent: ({ reset }) => <div className="p-8 text-center"><p>Something went wrong.</p><button onClick={reset} className="underline">Retry</button></div>,
  notFoundComponent: () => <div className="p-8 text-center">Article not found. <Link to="/blog" className="underline">Back to journal</Link></div>,
  head: ({ params }) => ({
    meta: [
      { title: `Article — ${params.slug}` },
      { property: "og:url", content: `/blog/${params.slug}` },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: `/blog/${params.slug}` }],
  }),
});

function BlogPost() {
  const { slug } = Route.useParams();
  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => (await supabase.from("blog_posts").select("*").eq("slug", slug).eq("is_published", true).maybeSingle()).data,
  });

  if (isLoading) return <div className="min-h-screen bg-background"><SiteHeader /><div className="container mx-auto px-6 py-16">Loading…</div></div>;
  if (!post) throw notFound();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <article className="container mx-auto px-6 py-16 max-w-3xl">
        <Link to="/blog" className="eyebrow mb-4 inline-block">← Journal</Link>
        <h1 className="text-5xl font-serif mb-4">{post.title}</h1>
        {post.published_at && <div className="text-xs text-muted-foreground mb-8">{new Date(post.published_at).toLocaleDateString()}</div>}
        {post.cover_image && <img src={post.cover_image} alt={post.title} className="w-full aspect-[16/9] object-cover mb-10" />}
        <div className="prose prose-invert max-w-none text-foreground/90 whitespace-pre-wrap leading-relaxed">{post.content}</div>
      </article>
      <SiteFooter />
    </div>
  );
}
