import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/warehouses")({ component: WarehousesAdmin });

function WarehousesAdmin() {
  return (
    <SimpleCrud
      bulkToggleField="is_active"
      table="warehouses"
      title="Warehouses"
      description="Physical stock locations."
      columns={[
        { key: "name", label: "Name" },
        { key: "is_default", label: "Default", render: (r) => r.is_default ? "★" : "—" },
        { key: "is_active", label: "Active", render: (r) => r.is_active ? "✓" : "—" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "address", label: "Address", type: "textarea" },
        { key: "is_default", label: "Default", type: "checkbox" },
        { key: "is_active", label: "Active", type: "checkbox" },
      ]}
    />
  );
}
