import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SimpleCrud } from "@/components/admin/simple-crud";
import { CheckCircle2, XCircle, PackageCheck, RotateCcw } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/returns")({ component: ReturnsAdmin });

function ReturnsAdmin() {
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("return_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(`Marked ${status}`);
  };

  return (
    <SimpleCrud
      table="return_requests"
      title="Returns"
      description="Customer return requests and refunds."
      enableDuplicate={false}
      disableCreate
      orderBy={{ column: "created_at", ascending: false }}
      searchColumns={["reason"]}
      selectQuery="*, orders(order_number, total)"
      columns={[
        { key: "created_at", label: "Requested", render: (r) => new Date(r.created_at).toLocaleDateString() },
        { key: "order", label: "Order", render: (r) => <span className="font-mono text-primary">{r.orders?.order_number ?? "—"}</span>, sortable: false },
        { key: "status", label: "Status" },
        { key: "reason", label: "Reason", render: (r) => <span className="text-muted-foreground line-clamp-2 max-w-md inline-block">{r.reason}</span>, sortable: false },
        { key: "refund_amount", label: "Refund", render: (r) => (r.refund_amount ? formatMoney(r.refund_amount) : "—") },
      ]}
      fields={[
        { key: "status", label: "Status", type: "select", options: [
          { value: "requested", label: "Requested" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
          { value: "received", label: "Received" },
          { value: "refunded", label: "Refunded" },
        ] },
        { key: "refund_amount", label: "Refund amount", type: "number" },
        { key: "reason", label: "Reason", type: "textarea", colSpan: 2 },
        { key: "admin_notes", label: "Internal notes", type: "textarea", colSpan: 2 },
      ]}
      customActions={[
        { key: "approve", label: "Approve", icon: CheckCircle2, variant: "primary", show: (r) => r.status === "requested", onClick: (r) => setStatus(r.id, "approved") },
        { key: "reject", label: "Reject", icon: XCircle, variant: "destructive", show: (r) => r.status === "requested", onClick: (r) => setStatus(r.id, "rejected") },
        { key: "received", label: "Mark received", icon: PackageCheck, show: (r) => r.status === "approved", onClick: (r) => setStatus(r.id, "received") },
        { key: "refunded", label: "Mark refunded", icon: RotateCcw, variant: "primary", show: (r) => r.status === "received", onClick: (r) => setStatus(r.id, "refunded") },
      ]}
    />
  );
}
