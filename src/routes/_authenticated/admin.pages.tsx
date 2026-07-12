import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/pages")({ component: PagesAdmin });

function PagesAdmin() {
  return (
    <SimpleCrud
      table="pages"
      title="CMS Pages"
      description="Static pages served on the storefront."
      bulkToggleField="is_published"
      orderBy={{ column: "updated_at", ascending: false }}
      searchColumns={["title", "slug"]}
      columns={[
        { key: "title", label: "Title" },
        { key: "slug", label: "Slug", render: (r) => <span className="font-mono text-xs">{r.slug}</span> },
        { key: "is_published", label: "Live", render: (r) => (r.is_published ? "✓" : "—") },
        { key: "updated_at", label: "Updated", render: (r) => new Date(r.updated_at).toLocaleDateString() },
      ]}
      fields={[
        { key: "title", label: "Title", required: true, colSpan: 2 },
        { key: "slug", label: "Slug", hint: "Auto-filled from title if empty" },
        { key: "meta_title", label: "Meta title" },
        { key: "meta_description", label: "Meta description", type: "textarea", colSpan: 2 },
        { key: "content", label: "Content (HTML/Markdown)", type: "textarea", colSpan: 2 },
        { key: "is_published", label: "Published", type: "checkbox" },
      ]}
    />
  );
}
