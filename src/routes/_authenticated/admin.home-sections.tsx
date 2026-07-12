import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/home-sections")({ component: HomeSectionsAdmin });

const TYPES = [
  { value: "hero", label: "Hero Slider" },
  { value: "featured_categories", label: "Featured Categories" },
  { value: "featured_products", label: "Featured Products" },
  { value: "banner", label: "Banner" },
  { value: "testimonials", label: "Testimonials" },
  { value: "newsletter", label: "Newsletter" },
  { value: "brands", label: "Brands" },
];

function HomeSectionsAdmin() {
  return (
    <SimpleCrud
      table="home_sections"
      title="Home Sections"
      description="Arrange the sections shown on the homepage."
      bulkToggleField="is_active"
      orderBy={{ column: "sort_order", ascending: true }}
      searchColumns={["title", "type"]}
      columns={[
        { key: "sort_order", label: "Order" },
        { key: "type", label: "Type" },
        { key: "title", label: "Title" },
        { key: "is_active", label: "Active", render: (r) => (r.is_active ? "✓" : "—") },
      ]}
      fields={[
        { key: "type", label: "Type", type: "select", options: TYPES, required: true },
        { key: "title", label: "Title", colSpan: 2 },
        { key: "subtitle", label: "Subtitle", colSpan: 2 },
        { key: "sort_order", label: "Order", type: "number" },
        { key: "is_active", label: "Active", type: "checkbox" },
      ]}
    />
  );
}
