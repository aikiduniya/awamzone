// Floating WhatsApp widget, entirely driven by site_settings.whatsapp.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, X } from "lucide-react";

type WA = {
  enabled?: boolean;
  phone?: string;
  message?: string;
  position?: "bottom-right" | "bottom-left";
  business_name?: string;
  business_logo?: string;
  greeting?: string;
  online?: boolean;
  working_hours?: string;
  color?: string;
};

export function WhatsAppWidget() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");

  const { data } = useQuery({
    queryKey: ["settings", "whatsapp"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "whatsapp").maybeSingle();
      return (data?.value ?? null) as WA | null;
    },
  });

  if (!data?.enabled || !data.phone) return null;

  const phone = data.phone.replace(/[^\d]/g, "");
  const text = encodeURIComponent(msg || data.message || "");
  const href = `https://wa.me/${phone}${text ? `?text=${text}` : ""}`;
  const pos = data.position === "bottom-left" ? "left-4 sm:left-6" : "right-4 sm:right-6";
  const bg = data.color || "#25D366";

  return (
    <div className={`fixed bottom-4 sm:bottom-6 ${pos} z-50`}>
      {open && (
        <div className="mb-3 w-80 max-w-[90vw] rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden animate-fade-in">
          <div className="p-4 flex items-center gap-3" style={{ background: bg, color: "#fff" }}>
            {data.business_logo && <img src={data.business_logo} alt="" className="h-10 w-10 rounded-full object-cover" />}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{data.business_name || "Chat with us"}</div>
              <div className="text-xs opacity-90 truncate">
                {data.online ? "● Online" : "○ Offline"}
                {data.working_hours ? ` · ${data.working_hours}` : ""}
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="opacity-90 hover:opacity-100">
              <X size={18} />
            </button>
          </div>
          <div className="p-4 space-y-3 bg-muted/40">
            <div className="rounded-lg bg-background p-3 text-sm border border-border">
              {data.greeting || "Hi there! How can we help you today?"}
            </div>
            <textarea
              rows={3}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Type your message…"
              className="w-full rounded-md border border-input bg-background p-2 text-sm focus:outline-none focus:border-primary"
            />
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2 rounded-md font-medium text-white"
              style={{ background: bg }}
            >
              Start Chat on WhatsApp
            </a>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="WhatsApp chat"
        className="h-14 w-14 rounded-full shadow-2xl flex items-center justify-center text-white transition hover:scale-105"
        style={{ background: bg }}
      >
        <MessageCircle size={26} />
      </button>
    </div>
  );
}
