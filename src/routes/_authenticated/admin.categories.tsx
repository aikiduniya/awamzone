import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesAdmin,
});

function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function CategoriesAdmin() {
  const { data, refetch } = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });
  const [editing, setEditing] = useState<any>(null);

  const save = async () => {
    if (!editing) return;
    const payload = { ...editing, slug: editing.slug || slugify(editing.name), sort_order: Number(editing.sort_order) || 0 };
    if (editing.id) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("categories").insert(rest);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved"); setEditing(null); refetch();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("categories").delete().eq("id", id);
    refetch();
  };

  return (
    <>
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="eyebrow mb-2">Catalog</div>
          <h1 className="text-4xl font-serif">Categories</h1>
        </div>
        <button onClick={() => setEditing({ name: "", slug: "", description: "", image_url: "", sort_order: 0, is_active: true, is_featured: false, parent_id: null })} className="inline-flex items-center gap-2 border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]">
          <Plus size={14} /> New Category
        </button>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface"><tr className="text-left eyebrow"><th className="p-4">Name</th><th className="p-4">Slug</th><th className="p-4">Order</th><th className="p-4">Active</th><th className="p-4">Featured</th><th /></tr></thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-4"><div className="flex items-center gap-3">{c.image_url && <img src={c.image_url} className="w-10 h-10 object-cover bg-surface" alt="" />}{c.name}</div></td>
                <td className="p-4 text-muted-foreground font-mono text-xs">{c.slug}</td>
                <td className="p-4">{c.sort_order}</td>
                <td className="p-4">{c.is_active ? "✓" : "—"}</td>
                <td className="p-4">{c.is_featured ? "★" : "—"}</td>
                <td className="p-4 text-right space-x-3">
                  <button onClick={() => setEditing(c)} className="text-primary text-xs uppercase tracking-[0.2em]">Edit</button>
                  <button onClick={() => remove(c.id)} className="text-destructive text-xs uppercase tracking-[0.2em]">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div className="bg-surface border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="font-serif text-2xl">{editing.id ? "Edit" : "New"} Category</h3><button onClick={() => setEditing(null)}><X /></button></div>
            <div className="space-y-3">
              <input placeholder="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <input placeholder="Slug" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <textarea rows={2} placeholder="Description" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <input placeholder="Image URL" value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <input placeholder="Banner URL" value={editing.banner_url ?? ""} onChange={(e) => setEditing({ ...editing, banner_url: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <input type="number" placeholder="Sort order" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="accent-primary" /> Active</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.is_featured} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} className="accent-primary" /> Featured</label>
              </div>
              <button onClick={save} className="w-full border border-primary bg-primary text-primary-foreground py-3 text-xs uppercase tracking-[0.24em]">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
