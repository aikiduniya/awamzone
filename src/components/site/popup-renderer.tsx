import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const KEY = "popup:dismissed:v1";

export function PopupRenderer() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [visibleId, setVisibleId] = useState<string | null>(null);

  useEffect(() => {
    try { setDismissed(new Set(JSON.parse(localStorage.getItem(KEY) || "[]"))); } catch {}
  }, []);

  const { data: popups } = useQuery({
    queryKey: ["popups-active"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase.from("popups").select("*").eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!popups?.length) return;
    const eligible = popups.find((p) => !dismissed.has(p.id));
    if (!eligible) return;
    const delay = eligible.trigger_type === "delay" ? (eligible.trigger_value || 5) * 1000 : 3000;
    const t = setTimeout(() => setVisibleId(eligible.id), delay);
    return () => clearTimeout(t);
  }, [popups, dismissed]);

  const popup = popups?.find((p) => p.id === visibleId);
  if (!popup) return null;

  const close = () => {
    const next = new Set(dismissed); next.add(popup.id);
    setDismissed(next);
    try { localStorage.setItem(KEY, JSON.stringify([...next])); } catch {}
    setVisibleId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur flex items-center justify-center p-4" onClick={close}>
      <div className="bg-surface border border-primary max-w-md w-full p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={close} className="absolute top-3 right-3 text-muted-foreground hover:text-primary"><X size={18} /></button>
        {popup.image_url && <img src={popup.image_url} alt="" className="w-full aspect-video object-cover mb-6" />}
        {popup.title && <h2 className="font-serif text-3xl mb-3">{popup.title}</h2>}
        {popup.body && <p className="text-sm text-muted-foreground mb-6 whitespace-pre-wrap">{popup.body}</p>}
        {popup.cta_url && popup.cta_label && (
          <a href={popup.cta_url} className="inline-block border border-primary bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.24em]">{popup.cta_label}</a>
        )}
      </div>
    </div>
  );
}
