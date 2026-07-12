import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, AdminCard, Field, Empty } from "@/components/admin/admin-ui";
import { MediaPicker } from "@/components/admin/media-picker";
import { useState } from "react";
import { toast } from "sonner";
import { GripVertical, ChevronUp, ChevronDown, Trash2, Edit3, Plus, Eye, EyeOff, Video, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/hero-slides")({ component: HeroSlidesAdmin });

type Slide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  kicker: string | null;
  desktop_image: string | null;
  mobile_image: string | null;
  video_url: string | null;
  background_color: string | null;
  overlay_opacity: number | null;
  text_align: string | null;
  text_position: string | null;
  primary_label: string | null;
  primary_link: string | null;
  secondary_label: string | null;
  secondary_link: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

const empty: Partial<Slide> = {
  title: "",
  subtitle: "",
  kicker: "",
  desktop_image: "",
  mobile_image: "",
  video_url: "",
  background_color: "",
  overlay_opacity: 0.4,
  text_align: "left",
  text_position: "center",
  primary_label: "",
  primary_link: "",
  secondary_label: "",
  secondary_link: "",
  is_active: true,
  starts_at: null,
  ends_at: null,
};

function HeroSlidesAdmin() {
  const qc = useQueryClient();
  const { data: slides = [] } = useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: async () => {
      const { data } = await supabase.from("hero_slides").select("*").order("sort_order");
      return (data ?? []) as Slide[];
    },
  });

  const [editing, setEditing] = useState<Partial<Slide> | null>(null);

  const save = useMutation({
    mutationFn: async (row: Partial<Slide>) => {
      const payload = { ...row };
      if (!payload.starts_at) payload.starts_at = null;
      if (!payload.ends_at) payload.ends_at = null;
      if (row.id) {
        const { error } = await supabase.from("hero_slides").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const maxOrder = Math.max(0, ...slides.map((s) => s.sort_order));
        const { error } = await supabase.from("hero_slides").insert({ ...payload, sort_order: maxOrder + 1 } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      qc.invalidateQueries({ queryKey: ["public-hero-slides"] });
      setEditing(null);
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hero_slides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      qc.invalidateQueries({ queryKey: ["public-hero-slides"] });
      toast.success("Deleted");
    },
  });

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const a = slides[idx]; const b = slides[target];
    await supabase.from("hero_slides").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("hero_slides").update({ sort_order: a.sort_order }).eq("id", b.id);
    qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
    qc.invalidateQueries({ queryKey: ["public-hero-slides"] });
  };

  const toggle = async (s: Slide) => {
    await supabase.from("hero_slides").update({ is_active: !s.is_active }).eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
    qc.invalidateQueries({ queryKey: ["public-hero-slides"] });
  };

  return (
    <>
      <AdminHeader
        title="Hero Banner"
        description="Manage homepage banner slides. Supports images, background video, scheduling, and multiple CTAs."
        actions={
          <button
            onClick={() => setEditing({ ...empty })}
            className="inline-flex items-center gap-2 border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.24em]"
          >
            <Plus size={14} /> Add slide
          </button>
        }
      />

      {!slides.length ? (
        <Empty>No hero slides yet. Add your first slide to populate the homepage banner.</Empty>
      ) : (
        <div className="space-y-3">
          {slides.map((s, i) => {
            const scheduled = s.starts_at || s.ends_at;
            const hasVideo = !!s.video_url;
            const preview = s.desktop_image || s.mobile_image;
            return (
              <div key={s.id} className="border border-border rounded-lg bg-card p-4 flex items-center gap-4">
                <div className="flex flex-col text-muted-foreground">
                  <button onClick={() => move(i, -1)} className="hover:text-primary disabled:opacity-30" disabled={i === 0}><ChevronUp size={16} /></button>
                  <GripVertical size={14} className="opacity-40" />
                  <button onClick={() => move(i, 1)} className="hover:text-primary disabled:opacity-30" disabled={i === slides.length - 1}><ChevronDown size={16} /></button>
                </div>

                <div className="relative w-32 aspect-video rounded overflow-hidden bg-surface shrink-0 grid place-items-center">
                  {hasVideo ? (
                    <div className="text-muted-foreground text-xs flex flex-col items-center gap-1"><Video size={20} /><span>Video</span></div>
                  ) : preview ? (
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon size={20} className="text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {s.kicker && <span className="text-[10px] uppercase tracking-[0.22em] text-primary">{s.kicker}</span>}
                    <span className="font-serif text-lg truncate">{s.title || "Untitled slide"}</span>
                    {!s.is_active && <span className="text-[10px] uppercase tracking-[0.2em] text-destructive border border-destructive px-2 py-0.5 rounded">Disabled</span>}
                    {scheduled && <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground border border-border px-2 py-0.5 rounded">Scheduled</span>}
                  </div>
                  {s.subtitle && <div className="text-xs text-muted-foreground line-clamp-1">{s.subtitle}</div>}
                  <div className="text-[11px] text-muted-foreground mt-1 flex gap-3 flex-wrap">
                    {s.primary_label && <span>Primary: {s.primary_label} → {s.primary_link}</span>}
                    {s.secondary_label && <span>Secondary: {s.secondary_label}</span>}
                    <span>Align: {s.text_align}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => toggle(s)} title={s.is_active ? "Disable" : "Enable"} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary text-muted-foreground hover:text-primary">
                    {s.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button onClick={() => setEditing(s)} title="Edit" className="h-8 w-8 grid place-items-center rounded hover:bg-secondary text-muted-foreground hover:text-primary">
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete slide "${s.title || "Untitled"}"?`)) remove.mutate(s.id); }}
                    title="Delete"
                    className="h-8 w-8 grid place-items-center rounded hover:bg-secondary text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <SlideEditor value={editing} onCancel={() => setEditing(null)} onSave={(v) => save.mutate(v)} saving={save.isPending} />}
    </>
  );
}

function SlideEditor({ value, onSave, onCancel, saving }: { value: Partial<Slide>; onSave: (v: Partial<Slide>) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState<Partial<Slide>>(value);
  const set = (k: keyof Slide, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const isVideo = !!form.video_url;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm-sm grid place-items-center p-4 overflow-auto">
      <div className="w-full max-w-3xl bg-card border border-border rounded-lg my-8">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-xl">{form.id ? "Edit slide" : "New slide"}</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-6">
          <AdminCard title="Content">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Kicker (small label)"><input className="input" value={form.kicker ?? ""} onChange={(e) => set("kicker", e.target.value)} /></Field>
              <Field label="Title"><input className="input" value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} /></Field>
            </div>
            <Field label="Subtitle"><textarea rows={2} className="input" value={form.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} /></Field>
          </AdminCard>

          <AdminCard title="Media" action={
            <div className="text-[11px] text-muted-foreground">
              {isVideo ? "Video mode — image is ignored" : "Image mode"}
            </div>
          }>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Desktop image" hint="Recommended 1920×900+">
                <div className="flex gap-2">
                  <input className="input flex-1" value={form.desktop_image ?? ""} onChange={(e) => set("desktop_image", e.target.value)} placeholder="https://…" />
                  <MediaPicker onPick={(urls) => set("desktop_image", urls[0])} trigger={<button type="button" className="px-3 py-2 text-xs uppercase tracking-[0.2em] border border-border">Pick</button>} />
                </div>
              </Field>
              <Field label="Mobile image" hint="Recommended 800×1000">
                <div className="flex gap-2">
                  <input className="input flex-1" value={form.mobile_image ?? ""} onChange={(e) => set("mobile_image", e.target.value)} placeholder="https://…" />
                  <MediaPicker onPick={(urls) => set("mobile_image", urls[0])} trigger={<button type="button" className="px-3 py-2 text-xs uppercase tracking-[0.2em] border border-border">Pick</button>} />
                </div>
              </Field>
            </div>
            <Field label="Background video URL" hint="MP4 URL. If set, video replaces the image entirely.">
              <input className="input" placeholder="https://…mp4" value={form.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} />
            </Field>
          </AdminCard>

          <AdminCard title="Call to action">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Primary button label"><input className="input" value={form.primary_label ?? ""} onChange={(e) => set("primary_label", e.target.value)} /></Field>
              <Field label="Primary button link"><input className="input" placeholder="/shop" value={form.primary_link ?? ""} onChange={(e) => set("primary_link", e.target.value)} /></Field>
              <Field label="Secondary button label"><input className="input" value={form.secondary_label ?? ""} onChange={(e) => set("secondary_label", e.target.value)} /></Field>
              <Field label="Secondary button link"><input className="input" value={form.secondary_link ?? ""} onChange={(e) => set("secondary_link", e.target.value)} /></Field>
            </div>
          </AdminCard>

          <AdminCard title="Layout & styling">
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Text alignment">
                <select className="input" value={form.text_align ?? "left"} onChange={(e) => set("text_align", e.target.value)}>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </Field>
              <Field label="Vertical position">
                <select className="input" value={form.text_position ?? "center"} onChange={(e) => set("text_position", e.target.value)}>
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </Field>
              <Field label="Overlay opacity" hint="0 = none, 1 = solid">
                <input type="number" step="0.05" min="0" max="1" className="input" value={form.overlay_opacity ?? 0.4} onChange={(e) => set("overlay_opacity", Number(e.target.value))} />
              </Field>
            </div>
            <Field label="Background color (fallback / behind video)"><input className="input" placeholder="#000000 or hsl(...)" value={form.background_color ?? ""} onChange={(e) => set("background_color", e.target.value)} /></Field>
          </AdminCard>

          <AdminCard title="Visibility & schedule">
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Active">
                <label className="flex items-center gap-2 h-10">
                  <input type="checkbox" checked={!!form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
                  <span className="text-sm">{form.is_active ? "Visible on site" : "Hidden"}</span>
                </label>
              </Field>
              <Field label="Starts at"><input type="datetime-local" className="input" value={form.starts_at ? form.starts_at.slice(0, 16) : ""} onChange={(e) => set("starts_at", e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>
              <Field label="Ends at"><input type="datetime-local" className="input" value={form.ends_at ? form.ends_at.slice(0, 16) : ""} onChange={(e) => set("ends_at", e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>
            </div>
          </AdminCard>
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-2">
          <button onClick={onCancel} className="px-5 py-2 text-xs uppercase tracking-[0.2em] border border-border">Cancel</button>
          <button disabled={saving} onClick={() => onSave(form)} className="px-5 py-2 text-xs uppercase tracking-[0.2em] border border-primary bg-primary text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save slide"}</button>
        </div>
      </div>
      <style>{`.input{width:100%;background:transparent;border:1px solid hsl(var(--border));padding:.55rem .75rem;font-size:.875rem;border-radius:.375rem}.input:focus{outline:none;border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}
