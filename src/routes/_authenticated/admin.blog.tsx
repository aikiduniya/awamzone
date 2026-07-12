import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/blog")({ component: BlogAdmin });

function BlogAdmin() {
  return (
    <div className="space-y-10">
      <SimpleCrud
      bulkToggleField="is_published"
        table="blog_categories"
        title="Blog Categories"
        description="Organize blog posts into topics."
        orderBy={{ column: "name", ascending: true }}
        columns={[{ key: "name", label: "Name" }, { key: "slug", label: "Slug" }]}
        fields={[
          { key: "name", label: "Name", required: true },
          { key: "slug", label: "Slug", hint: "Auto-generated from name if left empty" },
          { key: "description", label: "Description", type: "textarea" },
        ]}
      />
      <SimpleCrud
      bulkToggleField="is_published"
        table="blog_posts"
        title="Blog Posts"
        description="Publish articles, guides, and announcements."
        columns={[
          { key: "title", label: "Title" },
          { key: "slug", label: "Slug" },
          { key: "is_published", label: "Published", render: (r) => r.is_published ? "✓" : "—" },
        ]}
        fields={[
          { key: "title", label: "Title", required: true, colSpan: 2 },
          { key: "slug", label: "Slug" },
          { key: "cover_image", label: "Cover Image URL", type: "url" },
          { key: "excerpt", label: "Excerpt", type: "textarea" },
          { key: "content", label: "Content (Markdown/HTML)", type: "textarea" },
          { key: "tags", label: "Tags", type: "tags" },
          { key: "meta_title", label: "SEO Title" },
          { key: "meta_description", label: "SEO Description", type: "textarea" },
          { key: "published_at", label: "Published at", type: "datetime" },
          { key: "is_published", label: "Publish", type: "checkbox" },
        ]}
      />
    </div>
  );
}
