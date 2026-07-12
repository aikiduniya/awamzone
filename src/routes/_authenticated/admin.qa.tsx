import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SimpleCrud } from "@/components/admin/simple-crud";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/qa")({ component: QaAdmin });

function QaAdmin() {
  const setPublished = async (id: string, is_published: boolean) => {
    const { error } = await supabase.from("product_questions").update({ is_published }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(is_published ? "Published" : "Unpublished");
  };

  return (
    <SimpleCrud
      table="product_questions"
      title="Product Q&A"
      description="Customer questions and answers."
      enableDuplicate={false}
      orderBy={{ column: "created_at", ascending: false }}
      searchColumns={["question", "answer"]}
      selectQuery="*, products(name, slug)"
      columns={[
        { key: "created_at", label: "Date", render: (r) => new Date(r.created_at).toLocaleDateString() },
        { key: "product", label: "Product", render: (r) => r.products?.name ?? "—", sortable: false },
        { key: "question", label: "Question" },
        { key: "answer", label: "Answer", render: (r) => <span className="text-muted-foreground line-clamp-2 max-w-md inline-block">{r.answer ?? "—"}</span>, sortable: false },
        { key: "is_published", label: "Live", render: (r) => (r.is_published ? "✓" : "—") },
      ]}
      fields={[
        { key: "question", label: "Question", type: "textarea", colSpan: 2 },
        { key: "answer", label: "Answer", type: "textarea", colSpan: 2 },
        { key: "is_published", label: "Published", type: "checkbox" },
      ]}
      customActions={[
        { key: "publish", label: "Publish", icon: CheckCircle2, variant: "primary", show: (r) => !r.is_published, onClick: (r) => setPublished(r.id, true) },
        { key: "unpublish", label: "Unpublish", icon: XCircle, show: (r) => r.is_published, onClick: (r) => setPublished(r.id, false) },
      ]}
    />
  );
}
