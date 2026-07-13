import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/pages")({ component: PagesAdmin });

function PagesAdmin() {
  return (
    <SimpleCrud
      table="pages"
      title="CMS Pages"
      description="Static pages served on the storefront. URLs are clean and SEO-friendly, e.g. /about, /contact."
      bulkToggleField="is_published"
      orderBy={{ column: "menu_order", ascending: true }}
      searchColumns={["title", "slug"]}
      columns={[
        { key: "title", label: "Title" },
        {
          key: "slug",
          label: "URL",
          render: (r) => <span className="font-mono text-xs">/{r.slug}</span>,
        },
        { key: "menu_order", label: "Order" },
        { key: "show_in_header", label: "Header", render: (r) => (r.show_in_header ? "✓" : "—") },
        { key: "show_in_footer", label: "Footer", render: (r) => (r.show_in_footer ? "✓" : "—") },
        { key: "is_published", label: "Live", render: (r) => (r.is_published ? "✓" : "—") },
        { key: "updated_at", label: "Updated", render: (r) => new Date(r.updated_at).toLocaleDateString() },
      ]}
      fields={[
        { key: "title", label: "Page Title", required: true, colSpan: 2 },
        {
          key: "slug",
          label: "URL Slug",
          hint: "Public URL will be /your-slug. Auto-filled from title if empty.",
          colSpan: 2,
        },
        { key: "meta_title", label: "Meta Title" },
        { key: "meta_keywords", label: "Meta Keywords", hint: "Comma-separated" },
        { key: "meta_description", label: "Meta Description", type: "textarea", colSpan: 2 },
        { key: "content", label: "Content (HTML/Markdown)", type: "textarea", colSpan: 2 },
        { key: "menu_order", label: "Menu Order", type: "number" },
        { key: "is_published", label: "Enable (Published)", type: "checkbox" },
        { key: "show_in_header", label: "Show in Header", type: "checkbox" },
        { key: "show_in_footer", label: "Show in Footer", type: "checkbox" },
      ]}
    />
  );
}
