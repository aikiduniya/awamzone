import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Instagram, Facebook, Twitter, Youtube } from "lucide-react";

export function SiteFooter() {
  const { data: menus } = useQuery({
    queryKey: ["menu", "footer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .in("location", ["footer_1", "footer_2", "footer_3"])
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["settings", "footer-block"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key,value")
        .in("key", ["branding", "footer", "contact", "social"]);
      const map: Record<string, any> = {};
      data?.forEach((r) => (map[r.key] = r.value));
      return map;
    },
  });

  const [email, setEmail] = useState("");
  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    if (error && !error.message.includes("duplicate")) {
      toast.error("Couldn't subscribe. Try again.");
    } else {
      toast.success("Welcome to the house.");
      setEmail("");
    }
  };

  const branding = settings?.branding ?? {};
  const footer = settings?.footer ?? {};
  const contact = settings?.contact ?? {};
  const social = settings?.social ?? {};

  const col = (loc: string) => menus?.filter((m) => m.location === loc) ?? [];

  return (
    <footer className="mt-24 border-t border-border bg-surface text-foreground">
      <div className="container-luxe py-16 grid grid-cols-1 md:grid-cols-5 gap-10">
        <div className="md:col-span-2">
          <div className="text-2xl font-serif tracking-[0.3em] text-primary">{branding.site_name ?? "AURELIA"}</div>
          <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed">
            {footer.about ?? "A curated luxury marketplace for modern essentials."}
          </p>
          <div className="mt-6 flex gap-4 text-muted-foreground">
            {social.instagram && <a href={social.instagram} aria-label="Instagram" className="hover:text-primary"><Instagram size={18} /></a>}
            {social.facebook && <a href={social.facebook} aria-label="Facebook" className="hover:text-primary"><Facebook size={18} /></a>}
            {social.twitter && <a href={social.twitter} aria-label="Twitter" className="hover:text-primary"><Twitter size={18} /></a>}
            {social.youtube && <a href={social.youtube} aria-label="YouTube" className="hover:text-primary"><Youtube size={18} /></a>}
          </div>
        </div>

        <div>
          <div className="eyebrow mb-4">House</div>
          <ul className="space-y-2 text-sm">
            {col("footer_1").map((m) => (
              <li key={m.id}><Link to={m.url as any} className="text-muted-foreground hover:text-primary">{m.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-4">Service</div>
          <ul className="space-y-2 text-sm">
            {col("footer_2").map((m) => (
              <li key={m.id}><Link to={m.url as any} className="text-muted-foreground hover:text-primary">{m.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-4">Newsletter</div>
          <form onSubmit={subscribe} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent border-b border-border py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <button className="self-start text-xs uppercase tracking-[0.28em] text-primary border border-primary px-4 py-2 hover:bg-primary hover:text-primary-foreground transition">
              Subscribe
            </button>
          </form>
          {contact.email && <p className="mt-4 text-xs text-muted-foreground">{contact.email}</p>}
          {contact.phone && <p className="text-xs text-muted-foreground">{contact.phone}</p>}
        </div>
      </div>
      <div className="hairline" />
      <div className="container-luxe py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>{footer.copyright ?? "© AURELIA. All rights reserved."}</div>
        <div className="flex gap-6">
          {col("footer_3").map((m) => (
            <Link key={m.id} to={m.url as any} className="hover:text-primary">{m.label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
