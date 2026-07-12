import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, Empty } from "@/components/admin/admin-ui";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/purchase-orders")({ component: PoAdmin });

const STATUSES = ["draft", "sent", "confirmed", "received", "cancelled"];

function PoAdmin() {
  const { data, refetch } = useQuery({
    queryKey: ["admin-po"],
    queryFn: async () => (await supabase.from("purchase_orders").select("*, suppliers(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers-mini"], queryFn: async () => (await supabase.from("suppliers").select("id, name")).data ?? [] });
  const [editing, setEditing] = useState<any>(null);

  const save = async () => {
    const payload = { ...editing, total: Number(editing.total) || 0 };
    const { id, created_at, updated_at, suppliers, ...rest } = payload;
    if (id) await supabase.from("purchase_orders").update(rest).eq("id", id);
    else await supabase.from("purchase_orders").insert(rest);
    toast.success("Saved"); setEditing(null); refetch();
  };

  return (
    <>
      <AdminHeader title="Purchase Orders" description="Track stock ordered from suppliers." actions={
        <button onClick={() => setEditing({ supplier_id: "", reference: "", status: "draft", total: 0, notes: "" })} className="inline-flex items-center gap-2 border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]"><Plus size={14} /> New PO</button>
      } />
      {!data?.length ? <Empty>No purchase orders</Empty> : (
        <div className="border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary"><tr className="text-left"><th className="p-3">Ref</th><th className="p-3">Supplier</th><th className="p-3">Status</th><th className="p-3">Total</th><th /></tr></thead>
            <tbody>
              {data.map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{p.reference || p.id.slice(0, 8)}</td>
                  <td className="p-3">{p.suppliers?.name || "—"}</td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3">{formatMoney(p.total || 0)}</td>
                  <td className="p-3 text-right"><button onClick={() => setEditing({ ...p })} className="text-primary text-xs uppercase tracking-[0.2em]">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div className="bg-surface border border-border w-full max-w-lg p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center"><h3 className="font-serif text-2xl">{editing.id ? "Edit" : "New"} PO</h3><button onClick={() => setEditing(null)}><X /></button></div>
            <select value={editing.supplier_id || ""} onChange={(e) => setEditing({ ...editing, supplier_id: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 text-sm">
              <option value="">— Supplier —</option>
              {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input placeholder="Reference #" value={editing.reference ?? ""} onChange={(e) => setEditing({ ...editing, reference: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
            <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="number" placeholder="Total" value={editing.total ?? 0} onChange={(e) => setEditing({ ...editing, total: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
            <textarea rows={3} placeholder="Notes" value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
            <button onClick={save} className="w-full border border-primary bg-primary text-primary-foreground py-3 text-xs uppercase tracking-[0.24em]">Save</button>
          </div>
        </div>
      )}
    </>
  );
}
