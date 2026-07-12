import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/payments")({ component: PaymentsAdmin });

function PaymentsAdmin() {
  return (
    <SimpleCrud
      table="payment_methods"
      title="Payment Methods"
      description="Enabled payment providers on checkout."
      bulkToggleField="is_active"
      orderBy={{ column: "sort_order", ascending: true }}
      searchColumns={["name", "code"]}
      columns={[
        { key: "sort_order", label: "Order" },
        { key: "name", label: "Name" },
        { key: "code", label: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
        { key: "provider", label: "Provider" },
        { key: "fee_percentage", label: "Fee %" },
        { key: "is_active", label: "Active", render: (r) => (r.is_active ? "✓" : "—") },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "code", label: "Code", required: true, hint: "e.g. stripe, cod" },
        { key: "provider", label: "Provider" },
        { key: "description", label: "Description", type: "textarea", colSpan: 2 },
        { key: "fee_percentage", label: "Fee %", type: "number" },
        { key: "fee_fixed", label: "Fee fixed", type: "number" },
        { key: "sort_order", label: "Order", type: "number" },
        { key: "is_active", label: "Active", type: "checkbox" },
      ]}
    />
  );
}
