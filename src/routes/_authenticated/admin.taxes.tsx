import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader, Field, Empty } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/taxes")({ component: TaxesAdmin });

const BLANK = { name: "", rate: 0, countries: "*", regions: [] as string[], category_ids: [] as string[], is_compound: false, is_active: true, priority: 0 };

function TaxesAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: rows } = useQuery({ queryKey: ["admin-taxes"], queryFn: async () => (await supabase.from("tax_rates").select("*").order("priority")).data ?? [] });
  const { data: cats } = useQuery({ queryKey: ["cats-mini3"], queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [] });

  const save = async () => {
    const payload = {
      ...editing,
      rate: Number(editing.rate) || 0,
      countries: (typeof editing.countries === "string" ? editing.countries.split(",") : editing.countries).map((c: string) => c.trim().toUpperCase()).filter(Boolean),
    };
    delete payload.created_at; delete payload.updated_at;
    const { error } = editing.id
      ? await supabase.from("tax_rates").update(payload).eq("id", editing.id)
      : await supabase.from("tax_rates").insert(payload);
    if (error) return toast.error(error.message);
    setOpen(false); qc.invalidateQueries({ queryKey: ["admin-taxes"] });
  };
  const del = async (id: string) => { if (confirm("Delete?")) { await supabase.from("tax_rates").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-taxes"] }); } };

  return (
    <div>
      <AdminHeader title="Tax Rates" description="Country- and category-scoped tax rules applied at checkout." actions={
        <Button onClick={() => { setEditing({ ...BLANK }); setOpen(true); }}><Plus size={14} className="mr-1" /> New rate</Button>
      } />
      {!rows?.length ? <Empty>No tax rates yet.</Empty> : (
        <div className="border border-border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="text-left p-3">Name</th><th className="text-right p-3">Rate %</th><th className="text-left p-3">Countries</th><th className="text-left p-3">Active</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3 text-right">{r.rate}</td>
                  <td className="p-3 text-muted-foreground">{r.countries.join(", ")}</td>
                  <td className="p-3">{r.is_active ? "Yes" : "No"}</td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...r, countries: r.countries.join(", ") }); setOpen(true); }}><Edit size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 size={14} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit tax" : "New tax rate"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <Field label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="VAT 20%" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rate (%)"><Input type="number" step="0.001" value={editing.rate} onChange={(e) => setEditing({ ...editing, rate: e.target.value })} /></Field>
                <Field label="Priority"><Input type="number" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value })} /></Field>
              </div>
              <Field label="Countries (ISO codes)" hint="Use * to apply everywhere."><Input value={editing.countries} onChange={(e) => setEditing({ ...editing, countries: e.target.value })} placeholder="GB, DE, FR" /></Field>
              <Field label="Categories (leave empty for all)">
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                  {cats?.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={editing.category_ids.includes(c.id)} onChange={(e) => {
                        const set = new Set(editing.category_ids);
                        e.target.checked ? set.add(c.id) : set.delete(c.id);
                        setEditing({ ...editing, category_ids: [...set] });
                      }} className="accent-primary" />
                      {c.name}
                    </label>
                  ))}
                </div>
              </Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="accent-primary" />Active</label>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
