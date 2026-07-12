import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/brands")({
  component: BrandsAdmin,
});

function BrandsAdmin() {
  return (
    <SimpleCrud
      table="brands"
      title="Brands"
      description="Manufacturers and brand identities."
      orderBy={{ column: "sort_order", ascending: true }}
      defaults={{ is_active: true, is_featured: false, sort_order: 0 }}
      bulkToggleField="is_active"
      searchColumns={["name", "slug"]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "slug", label: "Slug", hint: "Auto-generated from name if left blank" },
        { key: "description", label: "Description", type: "textarea", colSpan: 2 },
        { key: "logo_url", label: "Logo URL", type: "url" },
        { key: "banner_url", label: "Banner URL", type: "url" },
        { key: "website", label: "Website", type: "url" },
        { key: "sort_order", label: "Sort order", type: "number" },
        { key: "is_active", label: "Active", type: "checkbox" },
        { key: "is_featured", label: "Featured", type: "checkbox" },
      ]}
      columns={[
        { key: "name", label: "Name", render: (r) => (
          <div className="flex items-center gap-3">
            {r.logo_url && <img src={r.logo_url} className="w-10 h-10 object-contain rounded bg-secondary p-1" alt="" />}
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
