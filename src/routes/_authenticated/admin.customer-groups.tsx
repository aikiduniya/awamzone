import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/customer-groups")({ component: GroupsAdmin });

function GroupsAdmin() {
  return (
    <SimpleCrud
      table="customer_groups"
      title="Customer Groups"
      description="Segment customers for pricing, discounts, and marketing."
      columns={[
        { key: "name", label: "Name" },
        { key: "discount_percent", label: "Discount %" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "discount_percent", label: "Automatic discount %", type: "number" },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
