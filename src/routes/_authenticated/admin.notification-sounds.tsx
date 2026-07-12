import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Upload, Volume2, VolumeX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/notification-sounds")({
  component: NotificationSoundsPage,
});

type SoundMap = Record<string, string>;
type Config = {
  enabled: boolean;
  volume: number; // 0..1
  sounds: SoundMap;
};

const EVENTS: { key: string; label: string }[] = [
  { key: "order.new", label: "New Order" },
  { key: "contact.new", label: "Contact Message" },
  { key: "review.new", label: "Product Review" },
  { key: "qa.new", label: "Product Question" },
  { key: "return.new", label: "Return Request" },
  { key: "refund.new", label: "Refund Request" },
  { key: "stock.low", label: "Low Stock" },
  { key: "stock.out", label: "Out of Stock" },
  { key: "customer.new", label: "Customer Registration" },
  { key: "newsletter.new", label: "Newsletter Subscribe" },
  { key: "default", label: "Default (fallback)" },
];

const DEFAULT_CONFIG: Config = { enabled: true, volume: 0.7, sounds: {} };

function NotificationSoundsPage() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "notification_sounds")
        .maybeSingle();
      if (data?.value) setConfig({ ...DEFAULT_CONFIG, ...(data.value as any) });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "notification_sounds", value: config as any }, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Notification sounds saved");
  };

  const uploadFor = async (eventKey: string, file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error("Please choose an audio file");
      return;
    }
    const path = `notification-sounds/${eventKey}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: signed } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    const url = signed?.signedUrl;
    if (!url) return;
    setConfig((c) => ({ ...c, sounds: { ...c.sounds, [eventKey]: url } }));
    toast.success(`${eventKey} sound uploaded`);
  };

  const preview = (url?: string) => {
    if (!url) return;
    if (!audioRef.current) return;
    audioRef.current.src = url;
    audioRef.current.volume = config.volume;
    audioRef.current.play().catch(() => {});
  };

  const clear = (eventKey: string) => {
    setConfig((c) => {
      const next = { ...c.sounds };
      delete next[eventKey];
      return { ...c, sounds: next };
    });
  };

  if (loading) return <div className="text-muted-foreground text-sm">Loading…</div>;

  return (
    <div>
      <audio ref={audioRef} preload="none" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif">Notification Sounds</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload and assign a unique sound per notification type.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 text-xs uppercase tracking-[0.2em] bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="text-sm font-medium">Sounds enabled</span>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
              className="h-4 w-4"
            />
            <span className="text-sm text-muted-foreground">{config.enabled ? "On" : "Off"}</span>
          </label>
        </div>
        <div>
          <label className="block text-sm mb-2">Volume: {Math.round(config.volume * 100)}%</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={config.volume}
            onChange={(e) => setConfig((c) => ({ ...c, volume: Number(e.target.value) }))}
            className="w-full"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Sound</th>
              <th className="px-4 py-3 font-medium w-56">Actions</th>
            </tr>
          </thead>
          <tbody>
            {EVENTS.map((ev) => {
              const url = config.sounds[ev.key];
              return (
                <tr key={ev.key} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{ev.label}</div>
                    <div className="text-xs text-muted-foreground font-mono">{ev.key}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-xs">
                    {url ? <a href={url} target="_blank" rel="noreferrer" className="hover:text-primary truncate block">{url.split("/").pop()?.split("?")[0]}</a> : <span className="italic">No sound assigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs cursor-pointer hover:bg-secondary">
                        <Upload size={12} />
                        Upload
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadFor(ev.key, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        onClick={() => preview(url)}
                        disabled={!url}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs hover:bg-secondary disabled:opacity-40"
                      >
                        <Play size={12} /> Test
                      </button>
                      {url && (
                        <button onClick={() => clear(ev.key)} className="text-xs text-destructive hover:underline">Clear</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Tip: Short MP3/OGG/WAV files (under ~1 second) work best. If a specific event has no sound assigned, the "Default" sound plays.
      </p>
    </div>
  );
}
