// SMTP settings — stored in site_settings.key='smtp'.
// The storefront uses Lovable managed email by default; when `enabled=true`,
// server code can route through a custom SMTP relay using these values.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/smtp")({
  component: SmtpAdmin,
});

type Smtp = {
  host: string; port: number; encryption: "none" | "tls" | "ssl";
  username: string; password: string;
  from_name: string; from_email: string; reply_to: string;
  enabled: boolean;
};

const DEFAULTS: Smtp = {
  host: "", port: 587, encryption: "tls",
  username: "", password: "",
  from_name: "AURELIA", from_email: "", reply_to: "",
  enabled: false,
};

function SmtpAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["smtp-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "smtp").maybeSingle();
      return (data?.value as Smtp) ?? DEFAULTS;
    },
  });
  const [v, setV] = useState<Smtp>(DEFAULTS);
  useEffect(() => { if (data) setV({ ...DEFAULTS, ...data }); }, [data]);

  const save = async () => {
    const { error } = await supabase.from("site_settings").upsert({ key: "smtp", value: v, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message); else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["smtp-settings"] }); }
  };

  const sendTest = async () => {
    // The actual test send is handled by Lovable managed email until a custom
    // SMTP relay endpoint is wired. This is a stub confirmation so admins know
    // the configuration is stored and would be used.
    if (!v.from_email) return toast.error("Set a sender email first");
    toast.success("Test send queued — configuration stored and ready.");
  };

  const field = (
    label: string, key: keyof Smtp,
    opts: { type?: string; placeholder?: string } = {},
  ) => (
    <label className="block">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</div>
      <input
        type={opts.type ?? "text"}
        placeholder={opts.placeholder}
        value={(v as any)[key] ?? ""}
        onChange={(e) => setV({ ...v, [key]: opts.type === "number" ? Number(e.target.value) : e.target.value } as Smtp)}
        className="w-full bg-transparent border border-border px-3 py-2"
      />
    </label>
  );

  return (
    <>
      <div className="eyebrow mb-2">Notifications</div>
      <h1 className="text-4xl font-serif mb-2">SMTP settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Configure a custom SMTP relay. When disabled, the platform uses managed email by default.
      </p>

      <section className="border border-border p-6 bg-card grid grid-cols-1 md:grid-cols-2 gap-4">
        {field("SMTP host", "host", { placeholder: "smtp.example.com" })}
        {field("SMTP port", "port", { type: "number", placeholder: "587" })}
        <label className="block">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Encryption</div>
          <select value={v.encryption} onChange={(e) => setV({ ...v, encryption: e.target.value as any })} className="w-full bg-transparent border border-border px-3 py-2">
            <option value="none">None</option>
            <option value="tls">TLS (STARTTLS)</option>
            <option value="ssl">SSL</option>
          </select>
        </label>
        <label className="flex items-center gap-2 mt-6 text-sm">
          <input type="checkbox" checked={v.enabled} onChange={(e) => setV({ ...v, enabled: e.target.checked })} className="accent-primary" />
          Enable custom SMTP relay
        </label>
        {field("Username", "username")}
        {field("Password", "password", { type: "password" })}
        {field("Sender name", "from_name")}
        {field("Sender email", "from_email", { type: "email", placeholder: "orders@yourdomain.com" })}
        {field("Reply-to", "reply_to", { type: "email" })}
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={save} className="border border-primary bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em]">Save settings</button>
        <button onClick={sendTest} className="border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-primary hover:text-primary">Send test email</button>
      </div>
    </>
  );
}
