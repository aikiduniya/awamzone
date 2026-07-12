import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SimpleCrud } from "@/components/admin/simple-crud";
import { CheckCircle2, XCircle, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reviews")({ component: ReviewsAdmin });

function ReviewsAdmin() {
  const setApproved = async (id: string, is_approved: boolean) => {
    const { error } = await supabase.from("reviews").update({ is_approved }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(is_approved ? "Approved" : "Rejected");
  };

  return (
    <SimpleCrud
      table="reviews"
      title="Product Reviews"
      description="Moderate customer reviews."
      readOnly
      disableEdit
      enableDuplicate={false}
      orderBy={{ column: "created_at", ascending: false }}
      searchColumns={["title", "body"]}
      selectQuery="*, products(name, slug)"
      fields={[]}
      columns={[
        { key: "created_at", label: "Date", render: (r) => new Date(r.created_at).toLocaleDateString() },
        { key: "product", label: "Product", render: (r) => r.products?.name ?? "—", sortable: false },
        { key: "rating", label: "Rating", render: (r) => (
          <span className="inline-flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < r.rating ? "fill-primary text-primary" : "text-muted-foreground/40"} />)}
          </span>
        ) },
        { key: "title", label: "Title" },
        { key: "body", label: "Body", render: (r) => <span className="text-muted-foreground line-clamp-2 max-w-md inline-block">{r.body}</span>, sortable: false },
        { key: "is_approved", label: "Approved", render: (r) => (r.is_approved ? "✓" : "—") },
      ]}
      customActions={[
        { key: "approve", label: "Approve", icon: CheckCircle2, variant: "primary", show: (r) => !r.is_approved, onClick: (r) => setApproved(r.id, true) },
        { key: "reject", label: "Reject", icon: XCircle, variant: "destructive", show: (r) => r.is_approved, onClick: (r) => setApproved(r.id, false) },
      ]}
    />
  );
}
