import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/site-header";

export const Route = createFileRoute("/pages/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} | AURELIA` }] }),
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
