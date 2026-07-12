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
      { name: "description", content: "Get in touch with our team." },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
});

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(5).max(4000),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message || "Invalid input");
    setSending(true);
    const { error } = await supabase.from("contact_submissions").insert(parsed.data);
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Message sent"); setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-6 py-16 max-w-xl">
        <div className="eyebrow mb-3">Contact</div>
        <h1 className="text-5xl font-serif mb-6">Get in touch</h1>
        <p className="text-muted-foreground mb-10">We reply within one business day.</p>
        <form onSubmit={submit} className="space-y-4">
          <input required maxLength={120} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-transparent border border-border px-4 py-3" />
          <input required type="email" maxLength={255} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-transparent border border-border px-4 py-3" />
          <input maxLength={200} placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full bg-transparent border border-border px-4 py-3" />
          <textarea required rows={6} maxLength={4000} placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full bg-transparent border border-border px-4 py-3" />
          <button disabled={sending} className="w-full border border-primary bg-primary text-primary-foreground py-3 text-xs uppercase tracking-[0.24em]">{sending ? "Sending…" : "Send message"}</button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
