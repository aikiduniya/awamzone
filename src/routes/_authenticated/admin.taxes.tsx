import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/taxes")({ component: TaxesAdmin });

function TaxesAdmin() {
  return (
    <SimpleCrud
      table="tax_rates"
      title="Tax Rates"
      description="VAT / sales tax configuration by country."
      bulkToggleField="is_active"
      orderBy={{ column: "priority", ascending: true }}
      searchColumns={["name", "countries"]}
      columns={[
        { key: "name", label: "Name" },
        { key: "rate", label: "Rate %", render: (r) => `${Number(r.rate).toFixed(2)}%` },
        { key: "countries", label: "Countries" },
        { key: "priority", label: "Priority" },
        { key: "is_compound", label: "Compound", render: (r) => (r.is_compound ? "✓" : "—") },
        { key: "is_active", label: "Active", render: (r) => (r.is_active ? "✓" : "—") },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "rate", label: "Rate %", type: "number", required: true },
        { key: "countries", label: "Countries", hint: "ISO codes comma-separated or *" },
        { key: "priority", label: "Priority", type: "number" },
        { key: "is_compound", label: "Compound", type: "checkbox" },
        { key: "is_active", label: "Active", type: "checkbox" },
      ]}
    />
  );
}
