import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingBag, User as UserIcon, Menu, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/site/theme-toggle";

export function AnnouncementBar() {
  const { data } = useQuery({
    queryKey: ["settings", "announcement"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "announcement").maybeSingle();
      return data?.value as { enabled?: boolean; text?: string; link?: string } | null;
    },
  });
  if (!data?.enabled || !data.text) return null;
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="container-luxe py-2 text-center text-[11px] tracking-[0.28em] uppercase">
        {data.link ? <Link to={data.link}>{data.text}</Link> : data.text}
      </div>
    </div>
  );
}

type MenuItem = {
  id: string;
  label: string;
  url: string;
  target: string | null;
  visibility: string | null;
  role_required: string | null;
  css_class: string | null;
  location: string;
};

// Client-side filter mirroring `visibility` semantics from admin.menus.
export function filterMenu(items: MenuItem[] | undefined, ctx: { authenticated: boolean; isAdmin: boolean }) {
  return (items ?? []).filter((m) => {
    switch (m.visibility) {
      case "guests":
        return !ctx.authenticated;
      case "authenticated":
        return ctx.authenticated;
      case "admin":
        return ctx.isAdmin;
      case "everyone":
      case null:
      case undefined:
      default:
        return true;
    }
  });
}

// Renders either a same-origin <Link> or an external <a> depending on target.
export function MenuLink({
  item,
  className,
  onClick,
  children,
}: {
  item: MenuItem;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const external = item.target === "_blank" || /^https?:\/\//i.test(item.url);
  const merged = cn(className, item.css_class);
  if (external) {
    return (
      <a
        href={item.url}
        target={item.target ?? "_blank"}
        rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
        className={merged}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={item.url as any} className={merged} onClick={onClick}>
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const { count } = useCart();
  const { user, isAdmin } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: menu } = useQuery({
    queryKey: ["menu", "header"],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("id,label,url,target,visibility,role_required,css_class,location")
        .eq("location", "header")
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []) as MenuItem[];
    },
  });

  const { data: branding } = useQuery({
    queryKey: ["settings", "branding"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "branding").maybeSingle();
      return data?.value as { site_name?: string; logo_url?: string } | null;
    },
  });

  const siteName = branding?.site_name ?? "AURELIA";
  const items = filterMenu(menu, { authenticated: !!user, isAdmin });

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="container-luxe flex h-20 items-center justify-between gap-6">
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/" className="text-2xl md:text-3xl font-serif tracking-[0.3em] text-primary">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={siteName} className="h-10" />
            ) : (
              siteName
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.24em]">
            {items.map((m) => (
              <MenuLink key={m.id} item={m} className="text-foreground/80 hover:text-primary transition-colors">
                {m.label}
              </MenuLink>
            ))}
          </nav>

          <div className="flex items-center gap-5">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link to="/shop" aria-label="Search" className="text-foreground/80 hover:text-primary">
              <Search size={18} />
            </Link>
            {user ? (
              <Link to="/account" aria-label="Account" className="text-foreground/80 hover:text-primary">
                <UserIcon size={18} />
              </Link>
            ) : (
              <Link to="/auth" aria-label="Sign in" className="text-foreground/80 hover:text-primary">
                <UserIcon size={18} />
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden md:inline text-[10px] uppercase tracking-[0.28em] text-primary border border-primary px-3 py-1 hover:bg-primary hover:text-primary-foreground transition"
              >
                Admin
              </Link>
            )}
            <Link to="/cart" className="relative text-foreground/80 hover:text-primary" aria-label="Bag">
              <ShoppingBag size={18} />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground px-1">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden border-t border-border bg-background">
            <div className="container-luxe flex flex-col py-4 gap-3 text-sm uppercase tracking-[0.2em]">
              {items.map((m) => (
                <MenuLink key={m.id} item={m} onClick={() => setMobileOpen(false)} className="py-2">
                  {m.label}
                </MenuLink>
              ))}
              {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="text-primary py-2">Admin</Link>}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}

export function SiteShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-h-screen flex flex-col", className)}>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

import { SiteFooter } from "./site-footer";
