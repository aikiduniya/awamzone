import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, AdminCard, Field } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/social")({
  component: SocialAndWhatsApp,
});

const PLATFORMS: { key: string; label: string }[] = [
  { key: "instagram", label: "Instagram" }, { key: "facebook", label: "Facebook" },
  { key: "twitter", label: "X (Twitter)" }, { key: "linkedin", label: "LinkedIn" },
  { key: "youtube", label: "YouTube" }, { key: "tiktok", label: "TikTok" },
  { key: "pinterest", label: "Pinterest" }, { key: "snapchat", label: "Snapchat" },
  { key: "threads", label: "Threads" }, { key: "telegram", label: "Telegram" },
  { key: "whatsapp", label: "WhatsApp" }, { key: "discord", label: "Discord" },
  { key: "reddit", label: "Reddit" },
];

function SocialAndWhatsApp() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings", "social+whatsapp"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key,value").in("key", ["social", "whatsapp"]);
      const map: Record<string, any> = {};
      (data ?? []).forEach((r: any) => (map[r.key] = r.value));
      return map;
    },
  });

  const [social, setSocial] = useState<any>({});
  const [wa, setWa] = useState<any>({});

  useEffect(() => {
    if (data?.social) setSocial(data.social);
    if (data?.whatsapp) setWa(data.whatsapp);
  }, [data]);

  const save = async (key: string, value: any) => {
    const { error } = await supabase.from("site_settings").upsert({ key, value }, { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["settings", "social+whatsapp"] });
    qc.invalidateQueries({ queryKey: ["settings", "whatsapp"] });
    qc.invalidateQueries({ queryKey: ["settings", "footer-block"] });
  };

  return (
    <>
      <AdminHeader title="Social & WhatsApp" description="Manage social links and the on-site WhatsApp chat widget. All values are live." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminCard title="Social media links" action={<Button onClick={() => save("social", social)}>Save</Button>}>
          <div className="space-y-2">
            {PLATFORMS.map((p) => {
              const v = social?.[p.key] ?? { url: "", enabled: false, order: 99 };
              return (
                <div key={p.key} className="grid grid-cols-[110px_1fr_70px_60px] gap-2 items-center">
                  <div className="text-sm">{p.label}</div>
                  <Input placeholder={`https://${p.key}.com/…`} value={v.url ?? ""} onChange={(e) => setSocial({ ...social, [p.key]: { ...v, url: e.target.value } })} />
                  <Input type="number" value={v.order ?? 0} onChange={(e) => setSocial({ ...social, [p.key]: { ...v, order: Number(e.target.value) } })} title="Order" />
                  <label className="text-xs inline-flex items-center gap-1 justify-center">
                    <input type="checkbox" checked={!!v.enabled} onChange={(e) => setSocial({ ...social, [p.key]: { ...v, enabled: e.target.checked } })} /> On
                  </label>
                </div>
              );
            })}
          </div>
        </AdminCard>

        <AdminCard title="WhatsApp widget" action={<Button onClick={() => save("whatsapp", wa)}>Save</Button>}>
          <label className="inline-flex items-center gap-2 text-sm mb-3">
            <input type="checkbox" checked={!!wa.enabled} onChange={(e) => setWa({ ...wa, enabled: e.target.checked })} /> Enable widget
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone number (international)"><Input placeholder="+1234567890" value={wa.phone ?? ""} onChange={(e) => setWa({ ...wa, phone: e.target.value })} /></Field>
            <Field label="Business name"><Input value={wa.business_name ?? ""} onChange={(e) => setWa({ ...wa, business_name: e.target.value })} /></Field>
            <Field label="Business logo URL"><Input value={wa.business_logo ?? ""} onChange={(e) => setWa({ ...wa, business_logo: e.target.value })} /></Field>
            <Field label="Position">
              <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={wa.position ?? "bottom-right"} onChange={(e) => setWa({ ...wa, position: e.target.value })}>
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
              </select>
            </Field>
            <Field label="Color (hex, optional)"><Input placeholder="#25D366" value={wa.color ?? ""} onChange={(e) => setWa({ ...wa, color: e.target.value })} /></Field>
            <Field label="Working hours"><Input placeholder="Mon–Fri 9–18" value={wa.working_hours ?? ""} onChange={(e) => setWa({ ...wa, working_hours: e.target.value })} /></Field>
            <Field label="Default message">
              <textarea rows={2} className="w-full rounded-md border border-input bg-background p-2 text-sm" value={wa.message ?? ""} onChange={(e) => setWa({ ...wa, message: e.target.value })} />
            </Field>
            <Field label="Greeting shown in widget">
              <textarea rows={2} className="w-full rounded-md border border-input bg-background p-2 text-sm" value={wa.greeting ?? ""} onChange={(e) => setWa({ ...wa, greeting: e.target.value })} />
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 text-sm mt-3">
            <input type="checkbox" checked={!!wa.online} onChange={(e) => setWa({ ...wa, online: e.target.checked })} /> Show "Online" badge
          </label>
        </AdminCard>
      </div>
    </>
  );
}
