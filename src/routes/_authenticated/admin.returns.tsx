import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, Empty } from "@/components/admin/admin-ui";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/returns")({ component: ReturnsAdmin });

const STATUSES = ["requested", "approved", "rejected", "received", "refunded"];

function ReturnsAdmin() {
  const { data, refetch } = useQuery({
    queryKey: ["admin-returns"],
    queryFn: async () => (await supabase.from("return_requests").select("*, orders(order_number, total)").order("created_at", { ascending: false })).data ?? [],
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("return_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated"); refetch();
  };

  return (
    <>
      <AdminHeader title="Returns & Refunds" description="Approve, reject, and process customer return requests." />
      {!data?.length ? <Empty>No return requests</Empty> : (
        <div className="border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary"><tr className="text-left">
              <th className="p-3">Order</th><th className="p-3">Reason</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Requested</th>
            </tr></thead>
            <tbody>
              {data.map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{r.orders?.order_number ?? r.order_id.slice(0, 8)}</td>
                  <td className="p-3 max-w-xs truncate">{r.reason}</td>
                  <td className="p-3">{r.refund_amount ? formatMoney(r.refund_amount) : "—"}</td>
                  <td className="p-3">
                    <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} className="bg-transparent border border-border px-2 py-1 text-xs">
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
