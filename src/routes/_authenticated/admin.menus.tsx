import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, Empty, useConfirm } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, ChevronUp, ChevronDown, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/menus")({
  component: MenusAdmin,
});

const LOCATIONS = [
  { value: "header", label: "Header (main nav)" },
  { value: "mobile", label: "Mobile menu" },
  { value: "sidebar", label: "Sidebar" },
  { value: "footer_1", label: "Footer — Column 1" },
  { value: "footer_2", label: "Footer — Column 2" },
  { value: "footer_3", label: "Footer — Column 3" },
  { value: "footer_legal", label: "Footer — Legal" },
];

const VISIBILITY = [
  { value: "everyone", label: "Everyone" },
  { value: "guests", label: "Guests only" },
  { value: "authenticated", label: "Signed-in users" },
  { value: "admin", label: "Admins only" },
];

type Item = {
  id: string;
  location: string;
  label: string;
  url: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  icon: string | null;
  target: string;
  visibility: string;
  role_required: string | null;
  css_class: string | null;
  description: string | null;
};

function MenusAdmin() {
  const [location, setLocation] = useState("header");
  const { confirm, dialog: confirmDialog } = useConfirm();

  const { data: items = [], refetch } = useQuery({
    queryKey: ["admin-menu-items", location],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .eq("location", location)
        .order("sort_order");
      return (data ?? []) as Item[];
    },
  });

  const [form, setForm] = useState<Partial<Item>>({
    label: "",
    url: "/",
    parent_id: null,
    is_active: true,
    target: "_self",
    visibility: "everyone",
  });

  const save = async () => {
    if (!form.label || !form.url) return toast.error("Label and URL are required");
    const payload = {
      location,
      label: form.label,
      url: form.url,
      parent_id: form.parent_id || null,
      icon: form.icon || null,
      target: form.target || "_self",
      visibility: form.visibility || "everyone",
      role_required: form.role_required || null,
      css_class: form.css_class || null,
      description: form.description || null,
      is_active: form.is_active ?? true,
      sort_order: (items[items.length - 1]?.sort_order ?? 0) + 10,
    };
    const { error } = await supabase.from("menu_items").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Menu item added");
    setForm({ label: "", url: "/", parent_id: null, is_active: true, target: "_self", visibility: "everyone" });
    refetch();
  };

  const update = async (id: string, patch: Partial<Item>) => {
    const { error } = await supabase.from("menu_items").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    refetch();
  };

  const remove = (id: string, label: string) => {
    confirm({
      title: "Delete menu item?",
      description: `“${label}” and any children will be permanently removed.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        await supabase.from("menu_items").delete().eq("id", id);
        refetch();
        toast.success("Deleted");
      },
    });
  };

  const move = async (item: Item, dir: -1 | 1) => {
    const siblings = items.filter((i) => (i.parent_id ?? null) === (item.parent_id ?? null));
    const idx = siblings.findIndex((s) => s.id === item.id);
    const swap = siblings[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("menu_items").update({ sort_order: swap.sort_order }).eq("id", item.id),
      supabase.from("menu_items").update({ sort_order: item.sort_order }).eq("id", swap.id),
    ]);
    refetch();
  };

  const topLevel = items.filter((i) => !i.parent_id);
  const childrenOf = (id: string) => items.filter((i) => i.parent_id === id);

  return (
    <>
      <AdminHeader title="Menus" description="Manage header, footer, mobile & sidebar navigation. Supports nested dropdowns, icons, and visibility rules." />

      <div className="mb-6 flex flex-wrap gap-2">
        {LOCATIONS.map((l) => (
          <button
            key={l.value}
            onClick={() => setLocation(l.value)}
            className={`px-3 py-2 text-xs uppercase tracking-[0.2em] border ${location === l.value ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          {topLevel.length === 0 ? <Empty>No items in this menu yet.</Empty> : topLevel.map((item) => (
            <MenuRow
              key={item.id}
              item={item}
              children={childrenOf(item.id)}
              parents={topLevel}
              onUpdate={update}
              onRemove={remove}
              onMove={move}
            />
          ))}
        </div>

        <aside className="border border-border p-5 space-y-3 h-fit sticky top-4">
          <div className="eyebrow">Add menu item</div>
          <Input placeholder="Label" value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <Input placeholder="URL (/shop, https://…)" value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.parent_id ?? ""} onChange={(e) => setForm({ ...form, parent_id: e.target.value || null })}>
            <option value="">No parent (top level)</option>
            {topLevel.map((p) => <option key={p.id} value={p.id}>↳ under {p.label}</option>)}
          </select>
          <Input placeholder="Icon (lucide name, optional)" value={form.icon ?? ""} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
            <option value="_self">Same tab</option>
            <option value="_blank">New tab</option>
          </select>
          <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
            {VISIBILITY.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
          <Input placeholder="CSS class (optional)" value={form.css_class ?? ""} onChange={(e) => setForm({ ...form, css_class: e.target.value })} />
          <Button className="w-full" onClick={save}><Plus size={14} className="mr-1" /> Add item</Button>
        </aside>
      </div>
    </>
  );
}

function MenuRow({ item, children, parents, onUpdate, onRemove, onMove }: {
  item: Item;
  children: Item[];
  parents: Item[];
  onUpdate: (id: string, patch: Partial<Item>) => void;
  onRemove: (id: string) => void;
  onMove: (item: Item, dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border ${item.is_active ? "border-border" : "border-dashed border-muted"} p-3`}>
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button onClick={() => onMove(item, -1)} aria-label="Move up" className="text-muted-foreground hover:text-primary"><ChevronUp size={14} /></button>
          <button onClick={() => onMove(item, 1)} aria-label="Move down" className="text-muted-foreground hover:text-primary"><ChevronDown size={14} /></button>
        </div>
        <div className="flex-1">
          <button onClick={() => setOpen((o) => !o)} className="text-left w-full">
            <div className="font-medium text-sm">{item.label}</div>
            <div className="text-[11px] text-muted-foreground">{item.url} · {item.visibility}{item.target === "_blank" ? " · new tab" : ""}{item.icon ? ` · ${item.icon}` : ""}</div>
          </button>
        </div>
        <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={item.is_active} onChange={(e) => onUpdate(item.id, { is_active: e.target.checked })} /> Active</label>
        <button onClick={() => onRemove(item.id)} className="text-destructive hover:opacity-70" aria-label="Delete"><Trash2 size={14} /></button>
      </div>

      {open && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
          <Input placeholder="Label" value={item.label} onChange={(e) => onUpdate(item.id, { label: e.target.value })} />
          <Input placeholder="URL" value={item.url} onChange={(e) => onUpdate(item.id, { url: e.target.value })} />
          <Input placeholder="Icon (lucide)" value={item.icon ?? ""} onChange={(e) => onUpdate(item.id, { icon: e.target.value || null })} />
          <Input placeholder="CSS class" value={item.css_class ?? ""} onChange={(e) => onUpdate(item.id, { css_class: e.target.value || null })} />
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={item.target} onChange={(e) => onUpdate(item.id, { target: e.target.value })}>
            <option value="_self">Same tab</option>
            <option value="_blank">New tab</option>
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={item.visibility} onChange={(e) => onUpdate(item.id, { visibility: e.target.value })}>
            {VISIBILITY.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
          <select className="col-span-2 h-9 rounded-md border border-input bg-background px-2 text-sm" value={item.parent_id ?? ""} onChange={(e) => onUpdate(item.id, { parent_id: e.target.value || null })}>
            <option value="">No parent (top level)</option>
            {parents.filter((p) => p.id !== item.id).map((p) => <option key={p.id} value={p.id}>↳ under {p.label}</option>)}
          </select>
        </div>
      )}

      {children.length > 0 && (
        <div className="mt-2 ml-6 space-y-2">
          {children.map((c) => (
            <MenuRow key={c.id} item={c} children={[]} parents={parents} onUpdate={onUpdate} onRemove={onRemove} onMove={onMove} />
          ))}
        </div>
      )}
    </div>
  );
}
