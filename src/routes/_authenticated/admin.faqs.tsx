import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/faqs")({ component: FaqsAdmin });

function FaqsAdmin() {
  return (
    <SimpleCrud
      table="faqs"
      title="FAQs"
      description="Frequently asked questions shown on the storefront."
      orderBy={{ column: "sort_order", ascending: true }}
      columns={[
        { key: "question", label: "Question" },
        { key: "category", label: "Category" },
        { key: "is_published", label: "Live", render: (r) => r.is_published ? "✓" : "—" },
      ]}
      fields={[
        { key: "question", label: "Question", required: true, colSpan: 2 },
        { key: "answer", label: "Answer", type: "textarea" },
        { key: "category", label: "Category" },
        { key: "sort_order", label: "Order", type: "number" },
        { key: "is_published", label: "Publish", type: "checkbox" },
      ]}
    />
  );
}
