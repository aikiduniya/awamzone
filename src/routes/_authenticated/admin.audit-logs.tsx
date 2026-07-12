import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/audit-logs")({ component: AuditLogs });

function AuditLogs() {
  return (
    <SimpleCrud
      table="audit_logs"
      title="Audit Logs"
      description="Every admin action, recorded."
      readOnly
      enableBulk={false}
      enableDuplicate={false}
      orderBy={{ column: "created_at", ascending: false }}
      searchColumns={["action", "entity_type"]}
      fields={[]}
      columns={[
        { key: "created_at", label: "When", render: (r) => new Date(r.created_at).toLocaleString() },
        { key: "action", label: "Action", render: (r) => <span className="font-mono text-xs">{r.action}</span> },
        { key: "entity_type", label: "Entity", render: (r) => <span className="text-xs">{r.entity_type}{r.entity_id ? `:${String(r.entity_id).slice(0, 8)}` : ""}</span> },
        { key: "actor_id", label: "Actor", render: (r) => <span className="font-mono text-xs">{r.actor_id?.slice(0, 8) ?? "—"}</span> },
      ]}
    />
  );
}
