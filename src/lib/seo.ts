// Builds head() meta/links from a DB record's SEO fields.
// Every content table (products, categories, brands, blog_posts, pages) shares
// the same optional SEO columns (meta_title, meta_description, og_*, twitter_*,
// canonical_url). Missing values fall back to sensible defaults from the record.
type SeoInput = {
  title: string;
  description?: string | null;
  path: string; // e.g. "/product/foo"
  image?: string | null;
  type?: "website" | "article" | "product";
  seo?: {
    meta_title?: string | null;
    meta_description?: string | null;
    og_title?: string | null;
    og_description?: string | null;
    og_image?: string | null;
    twitter_title?: string | null;
    twitter_description?: string | null;
    twitter_image?: string | null;
    canonical_url?: string | null;
  } | null;
};

export function buildSeoHead(input: SeoInput) {
  const s = input.seo ?? {};
  const title = s.meta_title || input.title;
  const description = s.meta_description || input.description || undefined;
  const ogTitle = s.og_title || title;
  const ogDescription = s.og_description || description;
  const ogImage = s.og_image || input.image || undefined;
  const twTitle = s.twitter_title || ogTitle;
  const twDescription = s.twitter_description || ogDescription;
  const twImage = s.twitter_image || ogImage;
  const canonical = s.canonical_url || input.path;

  const meta: Array<Record<string, string>> = [{ title }];
  if (description) meta.push({ name: "description", content: description });
  meta.push({ property: "og:title", content: ogTitle });
  if (ogDescription) meta.push({ property: "og:description", content: ogDescription });
  meta.push({ property: "og:url", content: canonical });
  meta.push({ property: "og:type", content: input.type ?? "website" });
  if (ogImage) meta.push({ property: "og:image", content: ogImage });
  meta.push({ name: "twitter:card", content: twImage ? "summary_large_image" : "summary" });
  meta.push({ name: "twitter:title", content: twTitle });
  if (twDescription) meta.push({ name: "twitter:description", content: twDescription });
  if (twImage) meta.push({ name: "twitter:image", content: twImage });

  return {
    meta,
    links: [{ rel: "canonical", href: canonical }],
  };
}
