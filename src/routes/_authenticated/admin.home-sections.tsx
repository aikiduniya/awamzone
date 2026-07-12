import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/home-sections")({
  component: HomeSectionsAdmin,
});

const TYPES = [
  { value: "hero", label: "Hero Slider" },
  { value: "featured_categories", label: "Featured Categories" },
  { value: "featured_products", label: "Featured Products" },
  { value: "trending", label: "Trending Products" },
  { value: "new_arrivals", label: "New Arrivals" },
  { value: "best_sellers", label: "Best Sellers" },
  { value: "banner", label: "Banner" },
  { value: "brand_slider", label: "Brand Slider" },
  { value: "testimonials", label: "Testimonials" },
  { value: "newsletter", label: "Newsletter" },
];

function HomeSectionsAdmin() {
  const { data, refetch } = useQuery({
    queryKey: ["admin-home-sections"],
    queryFn: async () => (await supabase.from("home_sections").select("*").order("sort_order")).data ?? [],
  });
  const [editing, setEditing] = useState<any>(null);

  const save = async () => {
    if (!editing) return;
    const payload = { ...editing, config: typeof editing.config === "string" ? JSON.parse(editing.config || "{}") : editing.config, sort_order: Number(editing.sort_order) || 0 };
    if (editing.id) {
      const { error } = await supabase.from("home_sections").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("home_sections").insert(rest);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved"); setEditing(null); refetch();
  };

  const move = async (row: any, dir: -1 | 1) => {
    await supabase.from("home_sections").update({ sort_order: (row.sort_order ?? 0) + dir }).eq("id", row.id);
    refetch();
  };

  return (
    <>
      <div className="flex items-end justify-between mb-8">
        <div><div className="eyebrow mb-2">Homepage</div><h1 className="text-4xl font-serif">Sections</h1></div>
        <button onClick={() => setEditing({ section_type: "featured_products", title: "", subtitle: "", description: "", config: "{}", sort_order: (data?.length ?? 0) + 1, is_active: true })} className="inline-flex items-center gap-2 border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]"><Plus size={14} /> New Section</button>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface"><tr className="text-left eyebrow"><th className="p-4">Order</th><th className="p-4">Type</th><th className="p-4">Title</th><th className="p-4">Active</th><th /></tr></thead>
          <tbody>
            {data?.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => move(s, -1)} className="text-muted-foreground hover:text-primary">↑</button>
                    <span>{s.sort_order}</span>
                    <button onClick={() => move(s, 1)} className="text-muted-foreground hover:text-primary">↓</button>
                  </div>
                </td>
                <td className="p-4"><span className="text-xs uppercase tracking-[0.2em]">{s.section_type}</span></td>
                <td className="p-4 font-serif">{s.title}</td>
                <td className="p-4">{s.is_active ? "✓" : "—"}</td>
                <td className="p-4 text-right space-x-3">
                  <button onClick={() => setEditing({ ...s, config: JSON.stringify(s.config, null, 2) })} className="text-primary text-xs uppercase tracking-[0.2em]">Edit</button>
                  <button onClick={async () => { if (confirm("Delete?")) { await supabase.from("home_sections").delete().eq("id", s.id); refetch(); } }} className="text-destructive text-xs uppercase tracking-[0.2em]">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div className="bg-surface border border-border w-full max-w-2xl p-6 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="font-serif text-2xl">{editing.id ? "Edit" : "New"} Section</h3><button onClick={() => setEditing(null)}><X /></button></div>
            <div className="space-y-3">
              <label className="block"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Type</div>
                <select value={editing.section_type} onChange={(e) => setEditing({ ...editing, section_type: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2">
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <input placeholder="Title" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <input placeholder="Eyebrow / Subtitle" value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <textarea rows={2} placeholder="Description" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <label className="block"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Config (JSON)</div>
                <textarea rows={8} value={editing.config} onChange={(e) => setEditing({ ...editing, config: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 font-mono text-xs" />
              </label>
              <input type="number" placeholder="Sort order" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="accent-primary" /> Active</label>
              <button onClick={save} className="w-full border border-primary bg-primary text-primary-foreground py-3 text-xs uppercase tracking-[0.24em]">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
