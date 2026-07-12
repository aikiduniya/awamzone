import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/email-templates")({ component: EmailTemplatesAdmin });

function EmailTemplatesAdmin() {
  return (
    <SimpleCrud
      table="email_templates"
      title="Email Templates"
      description="Transactional email content. Use {{variable}} tokens."
      columns={[
        { key: "code", label: "Code" },
        { key: "subject", label: "Subject" },
        { key: "is_active", label: "Active", render: (r) => r.is_active ? "✓" : "—" },
      ]}
      fields={[
        { key: "code", label: "Code", required: true, hint: "e.g. order_confirmation, welcome, password_reset" },
        { key: "subject", label: "Subject", colSpan: 2 },
        { key: "body", label: "Body (HTML)", type: "textarea" },
        { key: "is_active", label: "Active", type: "checkbox" },
      ]}
    />
  );
}
