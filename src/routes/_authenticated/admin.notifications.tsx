import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, Empty } from "@/components/admin/admin-ui";
import { CheckCheck, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-notifications-full"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const markAll = async () => {
    const ids = rows.filter((r: any) => !r.is_read).map((r: any) => r.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    qc.invalidateQueries({ queryKey: ["admin-notifications-full"] });
    qc.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-notifications-full"] });
    qc.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  return (
    <>
      <AdminHeader
        title="Notifications"
        description="All system alerts. Configure sounds and channels from Settings → Notifications."
        actions={<Button variant="outline" onClick={markAll}><CheckCheck size={14} className="mr-1" /> Mark all read</Button>}
      />
      {rows.length === 0 ? <Empty>No notifications yet.</Empty> : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {rows.map((n: any) => (
            <div key={n.id} className={`p-4 border-b border-border/60 last:border-0 flex items-start gap-4 ${!n.is_read ? "bg-primary/5" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{n.title}</div>
                {n.message && <div className="text-xs text-muted-foreground mt-1">{n.message}</div>}
                <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <span>{n.type ?? "info"}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                  {n.link && <Link to={n.link as any} className="text-primary hover:underline">Open →</Link>}
                </div>
              </div>
              {!n.is_read && (
                <button onClick={() => markOne(n.id)} className="text-muted-foreground hover:text-primary" aria-label="Mark read">
                  <Check size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
