// Dynamic theme system.
// - Reads `theme_mode`, `theme_light`, `theme_dark` from site_settings.
// - Applies the correct palette to :root as CSS variables.
// - Toggles the `.dark` class for downstream utilities.
// - Persists user preference (light/dark/system) in localStorage.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "light" | "dark" | "system";

type Palette = Record<string, string>;
type Ctx = {
  mode: ThemeMode;
  resolved: "light" | "dark";
  allowToggle: boolean;
  setMode: (m: ThemeMode) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "aurelia-theme-mode";

const CSS_VAR_MAP: Record<string, string> = {
  background: "--background",
  foreground: "--foreground",
  surface: "--surface",
  surface_foreground: "--surface-foreground",
  card: "--card",
  card_foreground: "--card-foreground",
  popover: "--popover",
  popover_foreground: "--popover-foreground",
  primary: "--primary",
  primary_foreground: "--primary-foreground",
  secondary: "--secondary",
  secondary_foreground: "--secondary-foreground",
  muted: "--muted",
  muted_foreground: "--muted-foreground",
  accent: "--accent",
  accent_foreground: "--accent-foreground",
  destructive: "--destructive",
  destructive_foreground: "--destructive-foreground",
  border: "--border",
  input: "--input",
  ring: "--ring",
  gold: "--gold",
  gold_foreground: "--gold-foreground",
};

function applyPalette(palette: Palette) {
  if (typeof document === "undefined" || !palette) return;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(palette)) {
    const varName = CSS_VAR_MAP[k];
    if (varName && v) root.style.setProperty(varName, String(v));
  }
}

function systemPref(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ["theme-settings"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key,value").in("key", ["theme_mode", "theme_light", "theme_dark"]);
      const map: Record<string, any> = {};
      (data ?? []).forEach((r: any) => (map[r.key] = r.value));
      return map;
    },
  });

  const cfg = data?.theme_mode ?? { default: "dark", allow_toggle: true, allow_system: true };
  const light: Palette = data?.theme_light ?? {};
  const dark: Palette = data?.theme_dark ?? {};

  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return (cfg.default as ThemeMode) ?? "dark";
    return ((localStorage.getItem(STORAGE_KEY) as ThemeMode) || (cfg.default as ThemeMode) || "dark");
  });

  // Sync default from settings on first load if the user hasn't chosen.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY) && cfg.default) setModeState(cfg.default as ThemeMode);
  }, [cfg.default]);

  const resolved: "light" | "dark" = mode === "system" ? systemPref() : mode;

  // React to system changes when in system mode.
  useEffect(() => {
    if (typeof window === "undefined" || mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const fn = () => setModeState("system"); // triggers re-render
    mq.addEventListener?.("change", fn);
    return () => mq.removeEventListener?.("change", fn);
  }, [mode]);

  // Apply palette + .dark class whenever inputs change.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const palette = resolved === "light" ? light : dark;
    applyPalette(palette);
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
  }, [resolved, light, dark]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, m);
  };

  const value = useMemo<Ctx>(() => ({ mode, resolved, allowToggle: cfg.allow_toggle !== false, setMode }), [mode, resolved, cfg.allow_toggle]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) return { mode: "dark" as ThemeMode, resolved: "dark" as const, allowToggle: true, setMode: () => {} };
  return ctx;
}
