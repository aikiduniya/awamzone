import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Linkedin,
  Github,
  MessageCircle,
  Send as SendIcon,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { filterMenu, MenuLink } from "./site-header";

// Fallback quick links so the footer always shows a useful menu
const QUICK_LINKS = [
  { label: "Home", url: "/" },
  { label: "Shop All", url: "/shop" },
  { label: "New Arrivals", url: "/shop?sort=new" },
  { label: "Best Sellers", url: "/shop?sort=best" },
  { label: "Blog", url: "/blog" },
  { label: "About Us", url: "/about" },
];

const HELP_LINKS = [
  { label: "Contact Us", url: "/contact" },
  { label: "FAQs", url: "/faq" },
  { label: "Shipping & Delivery", url: "/shipping" },
  { label: "Returns & Refunds", url: "/returns" },
  { label: "Track Your Order", url: "/account" },
  { label: "Privacy Policy", url: "/privacy" },
];

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

  const col = (loc: string) =>
    filterMenu(menus?.filter((m) => m.location === loc) as any, { authenticated: !!user, isAdmin });

  const quick = col("footer_1");
  const help = col("footer_2");
  const legal = col("footer_3");

  return (
    <footer className="mt-24 border-t border-border bg-surface text-foreground">
      {/* Trust badges bar */}
      <div className="border-b border-border/60 bg-background/40">
        <div className="container-luxe py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
          <TrustBadge Icon={Truck} title="Free Delivery" text="On orders over PKR 15,000" />
          <TrustBadge Icon={ShieldCheck} title="100% Authentic" text="Direct from luxury maisons" />
          <TrustBadge Icon={RotateCcw} title="30-Day Returns" text="No questions asked" />
          <TrustBadge Icon={CreditCard} title="Secure Checkout" text="Cash on delivery available" />
        </div>
      </div>

      <div className="container-luxe py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* About column */}
        <div className="md:col-span-4">
          <div className="text-3xl font-serif tracking-[0.3em] text-primary">
            {branding.site_name ?? "AURELIA"}
          </div>
          <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed">
            {footer.about ??
              "Pakistan's destination for authentic designer perfumes and luxury handbags. Curated from Chanel, Dior, Gucci, Louis Vuitton, Hermès and more."}
          </p>

          <div className="mt-6 space-y-2 text-sm">
            {contact.address && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
                <span>{contact.address}</span>
              </div>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition">
                <Phone size={14} className="text-primary shrink-0" />
                <span>{contact.phone}</span>
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition">
                <Mail size={14} className="text-primary shrink-0" />
                <span>{contact.email}</span>
              </a>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {renderSocialIcons(social)}
          </div>
        </div>

        {/* Quick links */}
        <div className="md:col-span-2">
          <div className="eyebrow mb-4">Quick Menu</div>
          <ul className="space-y-2.5 text-sm">
            {quick.length > 0
              ? quick.map((m) => (
                  <li key={m.id}>
                    <MenuLink item={m} className="text-muted-foreground hover:text-primary hover:translate-x-0.5 inline-block transition">
                      {m.label}
                    </MenuLink>
                  </li>
                ))
              : QUICK_LINKS.map((l) => (
                  <li key={l.url}>
                    <Link to={l.url as any} className="text-muted-foreground hover:text-primary hover:translate-x-0.5 inline-block transition">
                      {l.label}
                    </Link>
                  </li>
                ))}
          </ul>
        </div>

        {/* Help */}
        <div className="md:col-span-3">
          <div className="eyebrow mb-4">Customer Care</div>
          <ul className="space-y-2.5 text-sm">
            {help.length > 0
              ? help.map((m) => (
                  <li key={m.id}>
                    <MenuLink item={m} className="text-muted-foreground hover:text-primary hover:translate-x-0.5 inline-block transition">
                      {m.label}
                    </MenuLink>
                  </li>
                ))
              : HELP_LINKS.map((l) => (
                  <li key={l.url}>
                    <Link to={l.url as any} className="text-muted-foreground hover:text-primary hover:translate-x-0.5 inline-block transition">
                      {l.label}
                    </Link>
                  </li>
                ))}
          </ul>
        </div>

        {/* Newsletter */}
        <div className="md:col-span-3">
          <div className="eyebrow mb-4">Join The House</div>
          <p className="text-sm text-muted-foreground mb-4">
            Early access to new arrivals, private sales and styling notes.
          </p>
          <form onSubmit={subscribe} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border border-border rounded px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition"
            />
            <button className="bg-primary text-primary-foreground text-xs uppercase tracking-[0.28em] px-4 py-3 rounded hover:opacity-90 transition">
              Subscribe
            </button>
          </form>
        </div>
      </div>

      <div className="hairline" />
      <div className="container-luxe py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div>{footer.copyright ?? `© ${new Date().getFullYear()} AURELIA. All rights reserved.`}</div>
        <div className="flex flex-wrap items-center gap-6">
          {legal.length > 0
            ? legal.map((m) => (
                <MenuLink key={m.id} item={m} className="hover:text-primary transition">
                  {m.label}
                </MenuLink>
              ))
            : (
              <>
                <Link to={"/privacy" as any} className="hover:text-primary transition">Privacy</Link>
                <Link to={"/terms" as any} className="hover:text-primary transition">Terms</Link>
                <Link to={"/shipping" as any} className="hover:text-primary transition">Shipping</Link>
              </>
            )}
        </div>
      </div>
    </footer>
  );
}

function TrustBadge({ Icon, title, text }: { Icon: any; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="font-medium text-foreground">{title}</div>
        <div className="text-muted-foreground truncate">{text}</div>
      </div>
    </div>
  );
}

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
      if (typeof v === "string") return { key, url: v, enabled: !!v, order: 999 };
      return { key, url: v?.url ?? "", enabled: !!v?.enabled && !!v?.url, order: Number(v?.order ?? 999) };
    })
    .filter((e) => e.enabled && e.url && SOCIAL_ICONS[e.key])
    .sort((a, b) => a.order - b.order);
  return entries.map((e) => {
    const { Icon, label } = SOCIAL_ICONS[e.key];
    return (
      <a
        key={e.key}
        href={e.url}
        aria-label={label}
        target="_blank"
        rel="noopener noreferrer"
        className="h-9 w-9 grid place-items-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition"
      >
        <Icon size={15} />
      </a>
    );
  });
}
