import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SimpleCrud } from "@/components/admin/simple-crud";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/purchase-orders")({ component: PoAdmin });

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "confirmed", label: "Confirmed" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
];

function PoAdmin() {
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-mini"],
    queryFn: async () => (await supabase.from("suppliers").select("id, name").order("name")).data ?? [],
  });

  const supplierOpts = (suppliers ?? []).map((s: any) => ({ value: s.id, label: s.name }));

  return (
    <SimpleCrud
      table="purchase_orders"
      title="Purchase Orders"
      description="Stock ordered from suppliers."
      orderBy={{ column: "created_at", ascending: false }}
      searchColumns={["reference"]}
      selectQuery="*, suppliers(name)"
      columns={[
        { key: "reference", label: "Reference" },
        { key: "supplier", label: "Supplier", render: (r) => r.suppliers?.name ?? "—", sortable: false },
        { key: "status", label: "Status" },
        { key: "total", label: "Total", render: (r) => formatMoney(r.total) },
        { key: "created_at", label: "Created", render: (r) => new Date(r.created_at).toLocaleDateString() },
      ]}
      fields={[
        { key: "reference", label: "Reference", required: true },
        { key: "supplier_id", label: "Supplier", type: "select", options: supplierOpts },
        { key: "status", label: "Status", type: "select", options: STATUSES },
        { key: "total", label: "Total", type: "number" },
        { key: "notes", label: "Notes", type: "textarea", colSpan: 2 },
      ]}
    />
  );
}
