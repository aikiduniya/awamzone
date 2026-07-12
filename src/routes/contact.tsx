import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact — Aurelia" },
      { name: "description", content: "Get in touch with our team. We reply within one business day." },
      { property: "og:title", content: "Contact — Aurelia" },
      { property: "og:description", content: "Get in touch with our team." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
});

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Message is too short").max(4000),
  website: z.string().max(0).optional().or(z.literal("")), // honeypot
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message || "Invalid input");
    if (parsed.data.website) return; // bot
    setSending(true);
    const payload = {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    };
    const { error } = await supabase.from("contact_submissions").insert(payload);
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Message sent. We'll be in touch shortly.");
    setForm({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
  };

  const cls = "w-full bg-transparent border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-6 py-16 max-w-xl">
        <div className="eyebrow mb-3">Contact</div>
        <h1 className="text-5xl font-serif mb-6">Get in touch</h1>
        <p className="text-muted-foreground mb-10">We reply within one business day.</p>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <input required maxLength={120} placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={cls} autoComplete="name" />
          <input required type="email" maxLength={255} placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={cls} autoComplete="email" />
          <input type="tel" maxLength={40} placeholder="Phone number (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={cls} autoComplete="tel" />
          <input maxLength={200} placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={cls} />
          <textarea required rows={6} maxLength={4000} placeholder="How can we help?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={cls} />
          {/* Honeypot: hidden from users, filled by bots */}
          <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="hidden" name="website" />
          <button disabled={sending} className="w-full border border-primary bg-primary text-primary-foreground py-3 text-xs uppercase tracking-[0.24em] disabled:opacity-50">{sending ? "Sending…" : "Send message"}</button>
          <p className="text-[11px] text-muted-foreground text-center">By submitting, you agree to our privacy policy.</p>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
