import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/popups")({ component: PopupsAdmin });

function PopupsAdmin() {
  return (
    <SimpleCrud
      bulkToggleField="is_active"
      table="popups"
      title="Popups & Announcements"
      description="Promo popups, newsletter overlays, timed announcements."
      columns={[
        { key: "name", label: "Name" },
        { key: "trigger_type", label: "Trigger" },
        { key: "is_active", label: "Active", render: (r) => r.is_active ? "✓" : "—" },
      ]}
      fields={[
        { key: "name", label: "Internal name", required: true },
        { key: "title", label: "Headline" },
        { key: "body", label: "Body", type: "textarea" },
        { key: "image_url", label: "Image URL" },
        { key: "cta_label", label: "Button label" },
        { key: "cta_url", label: "Button URL" },
        { key: "trigger_type", label: "Trigger", type: "select", options: [
          { value: "delay", label: "After delay (seconds)" },
          { value: "exit_intent", label: "Exit intent" },
          { value: "scroll", label: "Scroll depth %" },
        ] },
        { key: "trigger_value", label: "Trigger value", type: "number" },
        { key: "starts_at", label: "Starts at", type: "datetime" },
        { key: "ends_at", label: "Ends at", type: "datetime" },
        { key: "is_active", label: "Active", type: "checkbox" },
      ]}
    />
  );
}
