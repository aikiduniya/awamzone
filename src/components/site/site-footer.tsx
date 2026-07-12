import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Instagram, Facebook, Twitter, Youtube, Linkedin, Github, MessageCircle, Send as SendIcon } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { filterMenu, MenuLink } from "./site-header";

export function SiteFooter() {
  const { user, isAdmin } = useSession();
  const { data: menus } = useQuery({
    queryKey: ["menu", "footer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("id,label,url,target,visibility,role_required,css_class,location")
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

  const col = (loc: string) => filterMenu(menus?.filter((m) => m.location === loc) as any, { authenticated: !!user, isAdmin });

  return (
    <footer className="mt-24 border-t border-border bg-surface text-foreground">
      <div className="container-luxe py-16 grid grid-cols-1 md:grid-cols-5 gap-10">
        <div className="md:col-span-2">
          <div className="text-2xl font-serif tracking-[0.3em] text-primary">{branding.site_name ?? "AURELIA"}</div>
          <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed">
            {footer.about ?? "A curated luxury marketplace for modern essentials."}
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-muted-foreground">
            {renderSocialIcons(social)}
          </div>
        </div>

        <div>
          <div className="eyebrow mb-4">House</div>
          <ul className="space-y-2 text-sm">
            {col("footer_1").map((m) => (
              <li key={m.id}><MenuLink item={m} className="text-muted-foreground hover:text-primary">{m.label}</MenuLink></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-4">Service</div>
          <ul className="space-y-2 text-sm">
            {col("footer_2").map((m) => (
              <li key={m.id}><MenuLink item={m} className="text-muted-foreground hover:text-primary">{m.label}</MenuLink></li>
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
            <MenuLink key={m.id} item={m} className="hover:text-primary">{m.label}</MenuLink>
          ))}
        </div>
      </div>
    </footer>
  );
}

// Icon set covering all supported platforms; lucide lacks some brand marks so
// we fall back to generic glyphs for those.
const SOCIAL_ICONS: Record<string, { label: string; Icon: any }> = {
  instagram: { label: "Instagram", Icon: Instagram },
  facebook: { label: "Facebook", Icon: Facebook },
  twitter: { label: "X (Twitter)", Icon: Twitter },
  linkedin: { label: "LinkedIn", Icon: Linkedin },
  youtube: { label: "YouTube", Icon: Youtube },
  tiktok: { label: "TikTok", Icon: MessageCircle },
  pinterest: { label: "Pinterest", Icon: MessageCircle },
  snapchat: { label: "Snapchat", Icon: MessageCircle },
  threads: { label: "Threads", Icon: MessageCircle },
  telegram: { label: "Telegram", Icon: SendIcon },
  whatsapp: { label: "WhatsApp", Icon: MessageCircle },
  discord: { label: "Discord", Icon: MessageCircle },
  reddit: { label: "Reddit", Icon: Github },
};

function renderSocialIcons(social: any) {
  if (!social) return null;
  const entries = Object.entries(social)
    .map(([key, v]: [string, any]) => {
      // Support both legacy flat strings and new { url, enabled, order } shape.
      if (typeof v === "string") return { key, url: v, enabled: !!v, order: 999 };
      return { key, url: v?.url ?? "", enabled: !!v?.enabled && !!v?.url, order: Number(v?.order ?? 999) };
    })
    .filter((e) => e.enabled && e.url && SOCIAL_ICONS[e.key])
    .sort((a, b) => a.order - b.order);
  return entries.map((e) => {
    const { Icon, label } = SOCIAL_ICONS[e.key];
    return (
      <a key={e.key} href={e.url} aria-label={label} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
        <Icon size={18} />
      </a>
    );
  });
}
