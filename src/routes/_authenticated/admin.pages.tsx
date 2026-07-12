import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/pages")({
  component: PagesAdmin,
});

function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function PagesAdmin() {
  const { data, refetch } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: async () => (await supabase.from("pages").select("*").order("slug")).data ?? [],
  });
  const [editing, setEditing] = useState<any>(null);

  const save = async () => {
    if (!editing) return;
    const payload = { ...editing, slug: editing.slug || slugify(editing.title) };
    if (editing.id) {
      const { error } = await supabase.from("pages").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("pages").insert(rest);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved"); setEditing(null); refetch();
  };

  return (
    <>
      <div className="flex items-end justify-between mb-8">
        <div><div className="eyebrow mb-2">Content</div><h1 className="text-4xl font-serif">CMS Pages</h1></div>
        <button onClick={() => setEditing({ title: "", slug: "", content: "", is_published: true })} className="inline-flex items-center gap-2 border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]"><Plus size={14} /> New Page</button>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface"><tr className="text-left eyebrow"><th className="p-4">Title</th><th className="p-4">Slug</th><th className="p-4">Published</th><th /></tr></thead>
          <tbody>
            {data?.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-4 font-serif">{p.title}</td>
                <td className="p-4 text-muted-foreground font-mono text-xs">/pages/{p.slug}</td>
                <td className="p-4">{p.is_published ? "✓" : "—"}</td>
                <td className="p-4 text-right space-x-3">
                  <button onClick={() => setEditing(p)} className="text-primary text-xs uppercase tracking-[0.2em]">Edit</button>
                  <button onClick={async () => { if (confirm("Delete?")) { await supabase.from("pages").delete().eq("id", p.id); refetch(); } }} className="text-destructive text-xs uppercase tracking-[0.2em]">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div className="bg-surface border border-border w-full max-w-3xl p-6 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="font-serif text-2xl">{editing.id ? "Edit" : "New"} Page</h3><button onClick={() => setEditing(null)}><X /></button></div>
            <div className="space-y-3">
              <input placeholder="Title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <input placeholder="Slug" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <textarea rows={12} placeholder="HTML content" value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 font-mono text-xs" />
              <input placeholder="Meta title" value={editing.meta_title ?? ""} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <textarea rows={2} placeholder="Meta description" value={editing.meta_description ?? ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.is_published} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} className="accent-primary" /> Published</label>
              <button onClick={save} className="w-full border border-primary bg-primary text-primary-foreground py-3 text-xs uppercase tracking-[0.24em]">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
