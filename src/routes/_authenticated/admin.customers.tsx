import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, Empty } from "@/components/admin/admin-ui";
import { toast } from "sonner";
import { useState } from "react";
import { X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/customers")({ component: CustomersAdmin });

function CustomersAdmin() {
  const { data, refetch } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => (await supabase.from("profiles").select("*, customer_groups(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: groups } = useQuery({ queryKey: ["cust-groups-mini"], queryFn: async () => (await supabase.from("customer_groups").select("id, name")).data ?? [] });
  const [editing, setEditing] = useState<any>(null);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({
      customer_group_id: editing.customer_group_id || null,
      admin_notes: editing.admin_notes,
      is_banned: !!editing.is_banned,
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setEditing(null); refetch();
  };

  return (
    <>
      <AdminHeader title="Customers" description="Manage customer accounts, groups, and notes." />
      {!data?.length ? <Empty>No customers</Empty> : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary"><tr className="text-left">
              <th className="p-3">Name</th><th className="p-3">Group</th><th className="p-3">Banned</th><th className="p-3">Joined</th><th />
            </tr></thead>
            <tbody>
              {data.map((c: any) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3">{c.full_name || "—"}</td>
                  <td className="p-3">{c.customer_groups?.name || "—"}</td>
                  <td className="p-3">{c.is_banned ? "🚫" : "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right"><button onClick={() => setEditing({ ...c })} className="text-primary text-xs uppercase tracking-[0.2em]">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div className="bg-surface border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="font-serif text-2xl">{editing.full_name}</h3><button onClick={() => setEditing(null)}><X /></button></div>
            <div className="space-y-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Customer Group</div>
                <select value={editing.customer_group_id || ""} onChange={(e) => setEditing({ ...editing, customer_group_id: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 text-sm">
                  <option value="">— None —</option>
                  {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Admin notes</div>
                <textarea rows={4} value={editing.admin_notes ?? ""} onChange={(e) => setEditing({ ...editing, admin_notes: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.is_banned} onChange={(e) => setEditing({ ...editing, is_banned: e.target.checked })} /> Banned</label>
              <button onClick={save} className="w-full border border-primary bg-primary text-primary-foreground py-3 text-xs uppercase tracking-[0.24em]">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
