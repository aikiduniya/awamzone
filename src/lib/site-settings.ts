// Site-wide settings hook + helpers. Reads the single row from `site_settings`
// (falls back to sensible defaults) and exposes currency + brand fields.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  currency: string;
  currency_symbol: string;
  site_name: string;
  support_email?: string | null;
  [k: string]: any;
};

const DEFAULTS: SiteSettings = {
  currency: "USD",
  currency_symbol: "$",
  site_name: "AURELIA",
  support_email: null,
};

export function useSiteSettings() {
  const q = useQuery({
    queryKey: ["site-settings"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      const value: any = (data as any)?.value ?? data ?? {};
      return { ...DEFAULTS, ...value } as SiteSettings;
    },
  });
  return q.data ?? DEFAULTS;
}

/** Format a money amount using site currency. */
export function useFormatMoney() {
  const s = useSiteSettings();
  return (amount: number | string | null | undefined) => {
    const n = Number(amount ?? 0);
    return `${s.currency_symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
}
