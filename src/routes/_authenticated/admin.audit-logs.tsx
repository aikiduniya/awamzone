import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, Empty } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/audit-logs")({ component: AuditLogs });

function AuditLogs() {
  const { data } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });

  return (
    <>
      <AdminHeader title="Audit Logs" description="Every admin action, recorded." />
      {!data?.length ? <Empty>No audit entries yet</Empty> : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary"><tr className="text-left">
              <th className="p-3">When</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Actor</th>
            </tr></thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-3 font-mono text-xs">{l.action}</td>
                  <td className="p-3 text-xs">{l.entity_type}{l.entity_id ? `:${String(l.entity_id).slice(0, 8)}` : ""}</td>
                  <td className="p-3 font-mono text-xs">{l.actor_id?.slice(0, 8) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
