import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, Empty } from "@/components/admin/admin-ui";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/contact")({ component: ContactAdmin });

function ContactAdmin() {
  const { data, refetch } = useQuery({
    queryKey: ["contact-submissions"],
    queryFn: async () => (await supabase.from("contact_submissions").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const markRead = async (id: string, is_read: boolean) => { await supabase.from("contact_submissions").update({ is_read }).eq("id", id); refetch(); };
  const remove = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("contact_submissions").delete().eq("id", id); refetch(); toast.success("Deleted"); };

  return (
    <>
      <AdminHeader title="Contact Submissions" description="Messages from your contact form." />
      {!data?.length ? <Empty>No messages</Empty> : (
        <div className="space-y-3">
          {data.map((m) => (
            <div key={m.id} className={`border p-5 ${m.is_read ? "border-border" : "border-primary"}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-serif text-lg">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.email}{m.subject ? ` • ${m.subject}` : ""}</div>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap mb-3">{m.message}</p>
              <div className="flex gap-3 text-xs">
                <button onClick={() => markRead(m.id, !m.is_read)} className="uppercase tracking-[0.2em] text-primary">{m.is_read ? "Mark unread" : "Mark read"}</button>
                <button onClick={() => remove(m.id)} className="uppercase tracking-[0.2em] text-destructive">Delete</button>
                <a href={`mailto:${m.email}`} className="uppercase tracking-[0.2em] ml-auto">Reply →</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
