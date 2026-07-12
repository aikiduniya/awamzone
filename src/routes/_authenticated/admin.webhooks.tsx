import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/webhooks")({ component: WebhooksAdmin });

const EVENTS = ["order.created", "order.paid", "order.shipped", "order.cancelled", "product.created", "product.updated", "customer.created"];

function WebhooksAdmin() {
  return (
    <SimpleCrud
      bulkToggleField="is_active"
      table="webhooks"
      title="Webhooks"
      description="Send events to external systems in real-time."
      columns={[
        { key: "name", label: "Name" },
        { key: "url", label: "URL" },
        { key: "events", label: "Events", render: (r) => (r.events || []).join(", ") },
        { key: "is_active", label: "Active", render: (r) => r.is_active ? "✓" : "—" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "url", label: "Delivery URL", colSpan: 2 },
        { key: "events", label: "Events", type: "tags", hint: `Available: ${EVENTS.join(", ")}` },
        { key: "secret", label: "Signing secret" },
        { key: "is_active", label: "Active", type: "checkbox" },
      ]}
    />
  );
}
