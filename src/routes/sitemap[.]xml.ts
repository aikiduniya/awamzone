import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const [{ data: products }, { data: cats }, { data: posts }, { data: pages }] = await Promise.all([
          sb.from("products").select("slug, updated_at").eq("is_active", true),
          sb.from("categories").select("slug, updated_at").eq("is_active", true),
          sb.from("blog_posts").select("slug, updated_at").eq("is_published", true),
          sb.from("pages").select("slug, updated_at").eq("is_published", true),
        ]);
        const staticPaths = ["/", "/shop", "/blog", "/faq", "/contact"];
        const urls: string[] = [];
        staticPaths.forEach((p) => urls.push(`<url><loc>${BASE_URL}${p}</loc><changefreq>weekly</changefreq></url>`));
        (products ?? []).forEach((r: any) => urls.push(`<url><loc>${BASE_URL}/product/${r.slug}</loc><lastmod>${r.updated_at}</lastmod></url>`));
        (cats ?? []).forEach((r: any) => urls.push(`<url><loc>${BASE_URL}/category/${r.slug}</loc><lastmod>${r.updated_at}</lastmod></url>`));
        (posts ?? []).forEach((r: any) => urls.push(`<url><loc>${BASE_URL}/blog/${r.slug}</loc><lastmod>${r.updated_at}</lastmod></url>`));
        (pages ?? []).forEach((r: any) => urls.push(`<url><loc>${BASE_URL}/pages/${r.slug}</loc><lastmod>${r.updated_at}</lastmod></url>`));
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
