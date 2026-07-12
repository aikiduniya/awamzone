import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/site-header";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/pages/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("pages")
      .select("title,meta_title,meta_description,og_title,og_description,og_image,twitter_title,twitter_description,twitter_image,canonical_url")
      .eq("slug", params.slug)
      .eq("is_published", true)
      .maybeSingle();
    return data;
  },
  head: ({ params, loaderData }) => {
    const p = loaderData as any;
    return buildSeoHead({
      title: p?.meta_title || p?.title || `${params.slug} | AURELIA`,
      description: null,
      path: `/pages/${params.slug}`,
      seo: p,
    });
  },
  component: PagePage,
});

function PagePage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: async () => (await supabase.from("pages").select("*").eq("slug", slug).eq("is_published", true).maybeSingle()).data,
  });
  return (
    <SiteShell>
      <div className="container-luxe py-20 max-w-3xl">
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : !data ? (
          <div className="text-muted-foreground">Page not found.</div>
        ) : (
          <>
            <div className="eyebrow mb-2">AURELIA</div>
            <h1 className="text-5xl font-serif mb-8">{data.title}</h1>
            <article className="prose prose-invert max-w-none text-foreground/90" dangerouslySetInnerHTML={{ __html: data.content ?? "" }} />
          </>
        )}
      </div>
    </SiteShell>
  );
}
