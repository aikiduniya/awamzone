import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/coupons")({ component: CouponsAdmin });

function CouponsAdmin() {
  return (
    <SimpleCrud
      table="coupons"
      title="Coupons"
      description="Promo codes and discount rules."
      bulkToggleField="is_active"
      orderBy={{ column: "created_at", ascending: false }}
      searchColumns={["code", "name"]}
      columns={[
        { key: "code", label: "Code", render: (r) => <span className="font-mono text-primary">{r.code}</span> },
        { key: "name", label: "Name" },
        { key: "type", label: "Type" },
        { key: "value", label: "Value" },
        { key: "usage_limit", label: "Limit" },
        { key: "usage_count", label: "Used" },
        { key: "is_active", label: "Active", render: (r) => (r.is_active ? "✓" : "—") },
      ]}
      fields={[
        { key: "code", label: "Code", required: true },
        { key: "name", label: "Name", required: true },
        { key: "description", label: "Description", type: "textarea", colSpan: 2 },
        { key: "type", label: "Type", type: "select", options: [
          { value: "percentage", label: "Percentage" },
          { value: "fixed", label: "Fixed amount" },
          { value: "free_shipping", label: "Free shipping" },
        ], required: true },
        { key: "value", label: "Value", type: "number" },
        { key: "minimum_amount", label: "Minimum cart", type: "number" },
        { key: "usage_limit", label: "Usage limit", type: "number" },
        { key: "usage_limit_per_user", label: "Per-user limit", type: "number" },
        { key: "starts_at", label: "Starts", type: "datetime" },
        { key: "expires_at", label: "Expires", type: "datetime" },
        { key: "is_active", label: "Active", type: "checkbox" },
      ]}
    />
  );
}
