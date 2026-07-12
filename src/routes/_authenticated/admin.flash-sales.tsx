import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Zap } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader, Field, Empty, useConfirm } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/flash-sales")({ component: FlashSalesAdmin });

const BLANK = {
  name: "", slug: "", description: "", banner_image: "",
  discount_type: "percent" as "percent" | "fixed", discount_value: 0,
  applies_to: "products" as "products" | "categories" | "all",
  product_ids: [] as string[], category_ids: [] as string[],
  starts_at: "", ends_at: "",
  is_deal_of_the_day: false, is_active: true, priority: 0,
};

function FlashSalesAdmin() {
  const qc = useQueryClient();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: rows } = useQuery({
    queryKey: ["admin-flash"],
    queryFn: async () => (await supabase.from("flash_sales").select("*").order("priority", { ascending: false })).data ?? [],
  });
  const { data: cats } = useQuery({ queryKey: ["cats-mini2"], queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [] });

  const openNew = () => { setEditing({ ...BLANK }); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing({
      ...BLANK, ...r,
      starts_at: r.starts_at ? r.starts_at.slice(0, 16) : "",
      ends_at: r.ends_at ? r.ends_at.slice(0, 16) : "",
      product_ids: r.product_ids ?? [], category_ids: r.category_ids ?? [],
    });
    setOpen(true);
  };

  const save = async () => {
    if (!editing.starts_at || !editing.ends_at) return toast.error("Start & end are required");
    const payload = {
      ...editing,
      discount_value: Number(editing.discount_value),
      priority: Number(editing.priority) || 0,
      starts_at: new Date(editing.starts_at).toISOString(),
      ends_at: new Date(editing.ends_at).toISOString(),
    };
    delete payload.created_at; delete payload.updated_at;
    const { error } = editing.id
      ? await supabase.from("flash_sales").update(payload).eq("id", editing.id)
      : await supabase.from("flash_sales").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-flash"] });
  };

  const del = (r: any) => {
    confirm({
      title: "Delete flash sale?",
      description: `“${r.name}” will be removed.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        await supabase.from("flash_sales").delete().eq("id", r.id);
        qc.invalidateQueries({ queryKey: ["admin-flash"] });
        toast.success("Deleted");
      },
    });
  };

  return (
    <div>
      <AdminHeader title="Flash Sales & Deal of the Day" description="Schedule limited-time discounts on products or categories." actions={
        <Button onClick={openNew}><Plus size={14} className="mr-1" /> New sale</Button>
      } />
      {rows && rows.length === 0 ? <Empty>No flash sales yet.</Empty> : (
        <div className="border border-border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Discount</th>
                <th className="text-left p-3">Window</th>
                <th className="text-left p-3">DOD</th>
                <th className="text-left p-3">Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 flex items-center gap-2"><Zap size={14} className="text-primary" />{r.name}</td>
                  <td className="p-3">{r.discount_value}{r.discount_type === "percent" ? "%" : ""}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.starts_at).toLocaleDateString()} → {new Date(r.ends_at).toLocaleDateString()}</td>
                  <td className="p-3">{r.is_deal_of_the_day ? "★" : ""}</td>
                  <td className="p-3">{r.is_active ? "Yes" : "No"}</td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del(r)}><Trash2 size={14} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit sale" : "New flash sale"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <Field label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Discount type">
                  <select value={editing.discount_type} onChange={(e) => setEditing({ ...editing, discount_type: e.target.value })} className="w-full h-9 border border-input bg-background rounded-md px-2 text-sm">
                    <option value="percent">Percent</option><option value="fixed">Fixed</option>
                  </select>
                </Field>
                <Field label="Value"><Input type="number" step="0.01" value={editing.discount_value} onChange={(e) => setEditing({ ...editing, discount_value: e.target.value })} /></Field>
                <Field label="Priority"><Input type="number" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts at"><Input type="datetime-local" value={editing.starts_at} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} /></Field>
                <Field label="Ends at"><Input type="datetime-local" value={editing.ends_at} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} /></Field>
              </div>
              <Field label="Applies to">
                <select value={editing.applies_to} onChange={(e) => setEditing({ ...editing, applies_to: e.target.value })} className="w-full h-9 border border-input bg-background rounded-md px-2 text-sm">
                  <option value="products">Specific products</option>
                  <option value="categories">Categories</option>
                  <option value="all">Entire catalog</option>
                </select>
              </Field>
              {editing.applies_to === "categories" && (
                <Field label="Categories">
                  <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                    {cats?.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={editing.category_ids.includes(c.id)} onChange={(e) => {
                          const set = new Set(editing.category_ids);
                          e.target.checked ? set.add(c.id) : set.delete(c.id);
                          setEditing({ ...editing, category_ids: [...set] });
                        }} className="accent-primary" />{c.name}
                      </label>
                    ))}
                  </div>
                </Field>
              )}
              {editing.applies_to === "products" && (
                <Field label="Product IDs (comma separated)">
                  <Input value={editing.product_ids.join(", ")} onChange={(e) => setEditing({ ...editing, product_ids: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                </Field>
              )}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_deal_of_the_day} onChange={(e) => setEditing({ ...editing, is_deal_of_the_day: e.target.checked })} className="accent-primary" />Deal of the Day</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="accent-primary" />Active</label>
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
