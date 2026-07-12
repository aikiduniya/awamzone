import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader, Field, Empty } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/coupons")({ component: CouponsAdmin });

const BLANK = {
  code: "", name: "", description: "",
  type: "percent" as "percent" | "fixed" | "free_shipping",
  value: 0, min_purchase: null as number | null, max_discount: null as number | null,
  usage_limit: null as number | null, per_user_limit: null as number | null,
  starts_at: "", ends_at: "",
  applies_to: "all" as "all" | "categories" | "products",
  category_ids: [] as string[], product_ids: [] as string[],
  is_active: true,
};

function CouponsAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: rows } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => (await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: cats } = useQuery({ queryKey: ["cats-mini"], queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [] });

  const openNew = () => { setEditing({ ...BLANK }); setOpen(true); };
  const openEdit = (row: any) => {
    setEditing({
      ...BLANK, ...row,
      starts_at: row.starts_at ? row.starts_at.slice(0, 16) : "",
      ends_at: row.ends_at ? row.ends_at.slice(0, 16) : "",
      category_ids: row.category_ids ?? [], product_ids: row.product_ids ?? [],
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      ...editing,
      code: editing.code.toUpperCase().trim(),
      value: Number(editing.value),
      min_purchase: editing.min_purchase ? Number(editing.min_purchase) : null,
      max_discount: editing.max_discount ? Number(editing.max_discount) : null,
      usage_limit: editing.usage_limit ? Number(editing.usage_limit) : null,
      per_user_limit: editing.per_user_limit ? Number(editing.per_user_limit) : null,
      starts_at: editing.starts_at ? new Date(editing.starts_at).toISOString() : null,
      ends_at: editing.ends_at ? new Date(editing.ends_at).toISOString() : null,
    };
    delete payload.used_count; delete payload.created_at;
    const { error } = editing.id
      ? await supabase.from("coupons").update(payload).eq("id", editing.id)
      : await supabase.from("coupons").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  return (
    <div>
      <AdminHeader title="Coupons & Discounts" description="Create promo codes with usage limits, product scope, and expiry." actions={
        <Button onClick={openNew}><Plus size={14} className="mr-1" /> New coupon</Button>
      } />

      {rows && rows.length === 0 ? <Empty>No coupons yet.</Empty> : (
        <div className="border border-border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Type</th>
                <th className="text-right p-3">Value</th>
                <th className="text-right p-3">Used</th>
                <th className="text-left p-3">Expires</th>
                <th className="text-left p-3">Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-mono">{r.code}</td>
                  <td className="p-3">{r.type}</td>
                  <td className="p-3 text-right">{r.value}{r.type === "percent" && "%"}</td>
                  <td className="p-3 text-right text-muted-foreground">{r.used_count}{r.usage_limit ? `/${r.usage_limit}` : ""}</td>
                  <td className="p-3 text-muted-foreground">{r.ends_at ? new Date(r.ends_at).toLocaleDateString() : "—"}</td>
                  <td className="p-3">{r.is_active ? "Yes" : "No"}</td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 size={14} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit coupon" : "New coupon"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code"><Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="SUMMER20" /></Field>
                <Field label="Name"><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              </div>
              <Field label="Description"><Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Type">
                  <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })} className="w-full h-9 border border-input bg-background rounded-md px-2 text-sm">
                    <option value="percent">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                    <option value="free_shipping">Free shipping</option>
                  </select>
                </Field>
                <Field label={editing.type === "percent" ? "Value %" : "Value"}>
                  <Input type="number" step="0.01" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} />
                </Field>
                <Field label="Max discount"><Input type="number" step="0.01" value={editing.max_discount ?? ""} onChange={(e) => setEditing({ ...editing, max_discount: e.target.value || null })} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Min purchase"><Input type="number" step="0.01" value={editing.min_purchase ?? ""} onChange={(e) => setEditing({ ...editing, min_purchase: e.target.value || null })} /></Field>
                <Field label="Usage limit"><Input type="number" value={editing.usage_limit ?? ""} onChange={(e) => setEditing({ ...editing, usage_limit: e.target.value || null })} /></Field>
                <Field label="Per-user limit"><Input type="number" value={editing.per_user_limit ?? ""} onChange={(e) => setEditing({ ...editing, per_user_limit: e.target.value || null })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts at"><Input type="datetime-local" value={editing.starts_at ?? ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} /></Field>
                <Field label="Ends at"><Input type="datetime-local" value={editing.ends_at ?? ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} /></Field>
              </div>
              <Field label="Applies to">
                <select value={editing.applies_to} onChange={(e) => setEditing({ ...editing, applies_to: e.target.value })} className="w-full h-9 border border-input bg-background rounded-md px-2 text-sm">
                  <option value="all">Entire cart</option>
                  <option value="categories">Specific categories</option>
                  <option value="products">Specific products (paste IDs)</option>
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
                        }} className="accent-primary" />
                        {c.name}
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
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="accent-primary" />
                Active
              </label>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
