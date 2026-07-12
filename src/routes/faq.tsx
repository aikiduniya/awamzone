import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  head: () => ({
    meta: [
      { title: "FAQ — Aurelia" },
      { name: "description", content: "Answers to common questions about shipping, returns, and orders." },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
  }),
});

function FaqPage() {
  const { data: faqs } = useQuery({
    queryKey: ["faqs"],
    queryFn: async () => (await supabase.from("faqs").select("*").eq("is_published", true).order("sort_order")).data ?? [],
  });
  const [open, setOpen] = useState<string | null>(null);
  const grouped: Record<string, any[]> = {};
  (faqs ?? []).forEach((f: any) => { (grouped[f.category || "General"] ||= []).push(f); });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <div className="eyebrow mb-3">Help</div>
        <h1 className="text-5xl font-serif mb-12">Frequently Asked Questions</h1>
        {Object.keys(grouped).length === 0 ? <p className="text-muted-foreground">No entries yet.</p> : Object.entries(grouped).map(([cat, items]) => (
          <section key={cat} className="mb-10">
            <h2 className="font-serif text-2xl mb-4">{cat}</h2>
            <div className="border-t border-border">
              {items.map((f: any) => (
                <div key={f.id} className="border-b border-border">
                  <button onClick={() => setOpen(open === f.id ? null : f.id)} className="w-full flex items-center justify-between py-4 text-left">
                    <span className="font-serif">{f.question}</span>
                    <ChevronDown size={16} className={open === f.id ? "rotate-180 transition" : "transition"} />
                  </button>
                  {open === f.id && <p className="pb-4 text-sm text-muted-foreground whitespace-pre-wrap">{f.answer}</p>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
