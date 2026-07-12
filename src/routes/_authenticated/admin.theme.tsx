// Theme settings — admin edits the full light + dark palettes and default mode.
// Values are stored in site_settings under keys `theme_mode`, `theme_light`, `theme_dark`
// and applied globally by <ThemeProvider>.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/theme")({
  component: ThemeAdmin,
});

type Palette = Record<string, string>;

const TOKENS: { key: string; label: string; group: string }[] = [
  { key: "background", label: "Background", group: "Surfaces" },
  { key: "foreground", label: "Foreground / text", group: "Surfaces" },
  { key: "surface", label: "Surface", group: "Surfaces" },
  { key: "card", label: "Card", group: "Surfaces" },
  { key: "popover", label: "Popover", group: "Surfaces" },
  { key: "primary", label: "Primary", group: "Brand" },
  { key: "primary_foreground", label: "Primary text", group: "Brand" },
  { key: "accent", label: "Accent", group: "Brand" },
  { key: "accent_foreground", label: "Accent text", group: "Brand" },
  { key: "gold", label: "Gold / highlight", group: "Brand" },
  { key: "gold_foreground", label: "Gold text", group: "Brand" },
  { key: "secondary", label: "Secondary", group: "UI" },
  { key: "secondary_foreground", label: "Secondary text", group: "UI" },
  { key: "muted", label: "Muted", group: "UI" },
  { key: "muted_foreground", label: "Muted text", group: "UI" },
  { key: "border", label: "Border", group: "UI" },
  { key: "input", label: "Input border", group: "UI" },
  { key: "ring", label: "Focus ring", group: "UI" },
  { key: "destructive", label: "Destructive", group: "State" },
  { key: "destructive_foreground", label: "Destructive text", group: "State" },
];

const GROUPS = ["Surfaces", "Brand", "UI", "State"];

function ThemeAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["theme-settings-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key,value").in("key", ["theme_mode", "theme_light", "theme_dark"]);
      const map: Record<string, any> = {};
      (data ?? []).forEach((r: any) => (map[r.key] = r.value));
      return map;
    },
  });

  const [mode, setMode] = useState<any>({ default: "dark", allow_toggle: true, allow_system: true });
  const [light, setLight] = useState<Palette>({});
  const [dark, setDark] = useState<Palette>({});

  useEffect(() => {
    if (!data) return;
    setMode(data.theme_mode ?? { default: "dark", allow_toggle: true, allow_system: true });
    setLight((data.theme_light ?? {}) as Palette);
    setDark((data.theme_dark ?? {}) as Palette);
  }, [data]);

  const save = async (key: string, value: any) => {
    const { error } = await supabase.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["theme-settings"] });
    qc.invalidateQueries({ queryKey: ["theme-settings-admin"] });
  };

  const renderPalette = (palette: Palette, setPalette: (p: Palette) => void, label: string, storeKey: string) => (
    <section className="border border-border p-6 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl">{label}</h3>
        <button onClick={() => save(storeKey, palette)} className="border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]">Save</button>
      </div>
      {GROUPS.map((g) => (
        <div key={g}>
          <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">{g}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {TOKENS.filter((t) => t.group === g).map((t) => (
              <label key={t.key} className="flex items-center gap-2 text-sm">
                <span className="w-40 text-muted-foreground">{t.label}</span>
                <span
                  className="inline-block h-6 w-6 rounded border border-border shrink-0"
                  style={{ background: palette[t.key] ?? "transparent" }}
                  aria-hidden
                />
                <input
                  value={palette[t.key] ?? ""}
                  onChange={(e) => setPalette({ ...palette, [t.key]: e.target.value })}
                  placeholder="oklch(...) or #hex"
                  className="flex-1 bg-transparent border border-border px-2 py-1 text-xs font-mono"
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </section>
  );

  return (
    <>
      <div className="eyebrow mb-2">Appearance</div>
      <h1 className="text-4xl font-serif mb-2">Theme</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Colours are stored as design tokens and applied instantly across the entire storefront and admin.
        Accepts any CSS colour: <code>oklch(...)</code>, <code>hsl(...)</code>, <code>#hex</code>, or named colours.
      </p>

      <section className="border border-border p-6 mb-6 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl">Mode</h3>
          <button onClick={() => save("theme_mode", mode)} className="border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]">Save</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Default</div>
            <select value={mode.default} onChange={(e) => setMode({ ...mode, default: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input type="checkbox" checked={!!mode.allow_toggle} onChange={(e) => setMode({ ...mode, allow_toggle: e.target.checked })} className="accent-primary" />
            Show theme switcher on site
          </label>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input type="checkbox" checked={!!mode.allow_system} onChange={(e) => setMode({ ...mode, allow_system: e.target.checked })} className="accent-primary" />
            Allow &quot;follow system&quot; option
          </label>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {renderPalette(light, setLight, "Light theme", "theme_light")}
        {renderPalette(dark, setDark, "Dark theme", "theme_dark")}
      </div>
    </>
  );
}
