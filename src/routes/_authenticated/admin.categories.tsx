import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesAdmin,
});

function CategoriesAdmin() {
  return (
    <SimpleCrud
      table="categories"
      title="Categories"
      description="Catalog categories with image, ordering, and visibility."
      orderBy={{ column: "sort_order", ascending: true }}
      defaults={{ is_active: true, is_featured: false, show_in_header: true, sort_order: 0 }}
      bulkToggleField="is_active"
      searchColumns={["name", "slug"]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "slug", label: "Slug", hint: "Auto-generated from name if left blank" },
        { key: "description", label: "Description", type: "textarea", colSpan: 2 },
        { key: "image_url", label: "Image URL", type: "url" },
        { key: "banner_url", label: "Banner URL", type: "url" },
        { key: "sort_order", label: "Sort order", type: "number" },
        { key: "is_active", label: "Active", type: "checkbox" },
        { key: "is_featured", label: "Featured", type: "checkbox" },
      ]}
      columns={[
        { key: "name", label: "Name", render: (r) => (
          <div className="flex items-center gap-3">
            {r.image_url && <img src={r.image_url} className="w-10 h-10 object-cover rounded bg-secondary" alt="" />}
            <span>{r.name}</span>
          </div>
        )},
        { key: "slug", label: "Slug", render: (r) => <span className="text-muted-foreground font-mono text-xs">{r.slug}</span> },
        { key: "sort_order", label: "Order" },
        { key: "is_active", label: "Active", render: (r) => (r.is_active ? "✓" : "—") },
        { key: "is_featured", label: "Featured", render: (r) => (r.is_featured ? "★" : "—") },
      ]}
    />
  );
}
