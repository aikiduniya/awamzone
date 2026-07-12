import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const KEYS = ["branding", "contact", "social", "seo", "footer", "features", "announcement"];

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").in("key", KEYS)).data ?? [],
  });

  const [values, setValues] = useState<Record<string, any>>({});
  useEffect(() => {
    if (!data) return;
    const map: Record<string, any> = {};
    data.forEach((r) => (map[r.key] = r.value));
    setValues(map);
  }, [data]);

  const save = async (key: string) => {
    const { error } = await supabase.from("site_settings").upsert({ key, value: values[key], updated_at: new Date().toISOString() });
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const renderField = (key: string, field: string, label?: string, type: "text" | "textarea" | "checkbox" = "text") => {
    const val = values[key]?.[field] ?? "";
    const setVal = (v: any) => setValues({ ...values, [key]: { ...(values[key] ?? {}), [field]: v } });
    return (
      <label key={field} className="block">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{label ?? field}</div>
        {type === "textarea" ? (
          <textarea value={val} onChange={(e) => setVal(e.target.value)} rows={3} className="w-full bg-transparent border border-border px-3 py-2" />
        ) : type === "checkbox" ? (
          <input type="checkbox" checked={!!val} onChange={(e) => setVal(e.target.checked)} className="accent-primary" />
        ) : (
          <input value={val} onChange={(e) => setVal(e.target.value)} className="w-full bg-transparent border border-border px-3 py-2" />
        )}
      </label>
    );
  };

  return (
    <>
      <div className="eyebrow mb-2">Configuration</div>
      <h1 className="text-4xl font-serif mb-8">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="border border-border p-6 space-y-3">
          <h3 className="font-serif text-xl">Branding</h3>
          {renderField("branding", "site_name", "Site name")}
          {renderField("branding", "tagline")}
          {renderField("branding", "logo_url", "Logo URL")}
          {renderField("branding", "favicon_url", "Favicon URL")}
          {renderField("branding", "currency", "Currency (e.g. USD)")}
          {renderField("branding", "currency_symbol", "Currency symbol")}
          <button onClick={() => save("branding")} className="border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]">Save</button>
        </section>

        <section className="border border-border p-6 space-y-3">
          <h3 className="font-serif text-xl">Contact</h3>
          {renderField("contact", "email")}
          {renderField("contact", "phone")}
          {renderField("contact", "address")}
          {renderField("contact", "whatsapp")}
          <button onClick={() => save("contact")} className="border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]">Save</button>
        </section>

        <section className="border border-border p-6 space-y-3">
          <h3 className="font-serif text-xl">Social</h3>
          {["instagram", "facebook", "twitter", "youtube", "tiktok"].map((k) => renderField("social", k))}
          <button onClick={() => save("social")} className="border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]">Save</button>
        </section>

        <section className="border border-border p-6 space-y-3">
          <h3 className="font-serif text-xl">SEO</h3>
          {renderField("seo", "default_title", "Default title")}
          {renderField("seo", "default_description", "Default description", "textarea")}
          {renderField("seo", "default_keywords", "Default keywords")}
          <button onClick={() => save("seo")} className="border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]">Save</button>
        </section>

        <section className="border border-border p-6 space-y-3">
          <h3 className="font-serif text-xl">Footer</h3>
          {renderField("footer", "about", "About text", "textarea")}
          {renderField("footer", "copyright")}
          <button onClick={() => save("footer")} className="border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]">Save</button>
        </section>

        <section className="border border-border p-6 space-y-3">
          <h3 className="font-serif text-xl">Announcement Bar</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!values.announcement?.enabled} onChange={(e) => setValues({ ...values, announcement: { ...(values.announcement ?? {}), enabled: e.target.checked } })} className="accent-primary" />
            Enabled
          </label>
          {renderField("announcement", "text")}
          {renderField("announcement", "link")}
          <button onClick={() => save("announcement")} className="border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]">Save</button>
        </section>

        <section className="border border-border p-6 space-y-3">
          <h3 className="font-serif text-xl">Features</h3>
          {renderField("features", "free_shipping_over", "Free shipping over ($)")}
          {renderField("features", "low_stock_threshold", "Low stock threshold")}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!values.features?.reviews_require_approval} onChange={(e) => setValues({ ...values, features: { ...(values.features ?? {}), reviews_require_approval: e.target.checked } })} className="accent-primary" />
            Reviews require approval
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!values.features?.guest_checkout} onChange={(e) => setValues({ ...values, features: { ...(values.features ?? {}), guest_checkout: e.target.checked } })} className="accent-primary" />
            Guest checkout
          </label>
          <button onClick={() => save("features")} className="border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]">Save</button>
        </section>
      </div>
    </>
  );
}
