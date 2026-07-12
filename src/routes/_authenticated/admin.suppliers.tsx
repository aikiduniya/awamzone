import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/suppliers")({ component: SuppliersAdmin });

function SuppliersAdmin() {
  return (
    <SimpleCrud
      bulkToggleField="is_active"
      table="suppliers"
      title="Suppliers"
      description="Vendors and manufacturers for purchase orders."
      columns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "is_active", label: "Active", render: (r) => r.is_active ? "✓" : "—" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "address", label: "Address", type: "textarea" },
        { key: "notes", label: "Notes", type: "textarea" },
        { key: "is_active", label: "Active", type: "checkbox" },
      ]}
    />
  );
}
