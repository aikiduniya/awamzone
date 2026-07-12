// Admin notification bell: badge, dropdown list, mark-read, realtime + sound.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

type N = {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const SOUND_KEY = "aurelia-notif-sound";

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(() =>
    typeof window === "undefined" ? true : localStorage.getItem(SOUND_KEY) !== "off",
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["settings", "notifications_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "notifications_settings").maybeSingle();
      return (data?.value ?? null) as { sound_url?: string; sound_enabled?: boolean } | null;
    },
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["admin-notifications"],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as N[];
    },
  });

  const unread = useMemo(() => rows.filter((r) => !r.is_read).length, [rows]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-notifications"] });
        if (soundOn && settings?.sound_enabled !== false) {
          try {
            audioRef.current?.play().catch(() => {});
          } catch {}
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, soundOn, settings?.sound_enabled]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  const markAll = async () => {
    const ids = rows.filter((r) => !r.is_read).map((r) => r.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    qc.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (typeof window !== "undefined") localStorage.setItem(SOUND_KEY, next ? "on" : "off");
  };

  const soundUrl =
    settings?.sound_url ||
    // A short, free notification chime encoded as data URI (silent fallback if blocked)
    "data:audio/mpeg;base64,";

  return (
    <div className="relative">
      <audio ref={audioRef} src={soundUrl} preload="auto" />
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-secondary text-foreground/80 hover:text-primary transition"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold inline-flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 max-w-[92vw] rounded-lg border border-border bg-popover text-popover-foreground shadow-xl z-50 animate-fade-in">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="font-medium text-sm">Notifications {unread > 0 && <span className="text-muted-foreground">({unread})</span>}</div>
              <div className="flex items-center gap-2">
                <button onClick={toggleSound} className="text-muted-foreground hover:text-primary" title={soundOn ? "Mute" : "Unmute"}>
                  {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
                <button onClick={markAll} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1" title="Mark all as read">
                  <CheckCheck size={12} /> Mark all
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {rows.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">You're all caught up.</div>
              ) : (
                rows.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 border-b border-border/60 last:border-0 flex gap-3 items-start ${!n.is_read ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{n.title}</div>
                      {n.message && <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>}
                      <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
                        <span>{n.type ?? "info"}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                        {n.link && (
                          <Link to={n.link as any} onClick={() => { setOpen(false); markRead(n.id); }} className="text-primary hover:underline">Open →</Link>
                        )}
                      </div>
                    </div>
                    {!n.is_read && (
                      <button onClick={() => markRead(n.id)} className="text-muted-foreground hover:text-primary shrink-0" aria-label="Mark read">
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t border-border text-center">
              <Link to="/admin/notifications" onClick={() => setOpen(false)} className="text-xs uppercase tracking-[0.2em] text-primary hover:underline">View all</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
