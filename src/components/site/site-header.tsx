import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingBag, Menu, X, ChevronDown } from "lucide-react";
import { UserMenu } from "@/components/site/user-menu";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/site/theme-toggle";

type Category = { id: string; name: string; slug: string; parent_id: string | null; image_url: string | null };

export function CategoriesMenu() {
  const [open, setOpen] = useState(false);
  const { data: cats } = useQuery({
    queryKey: ["header", "categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name,slug,parent_id,image_url")
        .eq("is_active", true)
        .eq("show_in_header", true)
        .order("sort_order")
        .order("name");
      return (data ?? []) as Category[];
    },
  });
  const roots = (cats ?? []).filter((c) => !c.parent_id);
  const childrenOf = (id: string) => (cats ?? []).filter((c) => c.parent_id === id);
  if (roots.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="flex items-center gap-1.5 text-foreground/80 hover:text-primary transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        Categories <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full -translate-x-1/2 pt-4 z-50">
          <div className="bg-popover/95 backdrop-blur-xl border border-border shadow-2xl rounded-lg overflow-hidden w-[min(90vw,880px)]">
            {/* Gold accent bar */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="p-8 grid grid-cols-3 gap-x-10 gap-y-8">
              {roots.slice(0, 6).map((r) => (
                <CategoryColumn
                  key={r.id}
                  node={r}
                  childrenOf={childrenOf}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
            <div className="border-t border-border/60 bg-surface/50 px-8 py-4 flex items-center justify-between text-xs">
              <span className="text-muted-foreground uppercase tracking-[0.24em]">Explore the full collection</span>
              <Link
                to="/shop"
                onClick={() => setOpen(false)}
                className="text-primary uppercase tracking-[0.24em] hover:underline"
              >
                Shop all →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryColumn({
  node,
  childrenOf,
  onNavigate,
}: {
  node: Category;
  childrenOf: (id: string) => Category[];
  onNavigate: () => void;
}) {
  const kids = childrenOf(node.id);
  return (
    <div>
      <Link
        to={"/category/" + node.slug as any}
        onClick={onNavigate}
        className="group flex items-center gap-3 pb-3 mb-3 border-b border-border/60"
      >
        {node.image_url ? (
          <img src={node.image_url} alt={node.name} className="h-10 w-10 rounded object-cover" />
        ) : (
          <span className="h-10 w-10 grid place-items-center rounded bg-primary/10 text-primary font-serif">
            {node.name.charAt(0)}
          </span>
        )}
        <span className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
          {node.name}
        </span>
      </Link>
      {kids.length > 0 && (
        <ul className="space-y-1.5">
          {kids.slice(0, 6).map((k) => (
            <li key={k.id}>
              <Link
                to={"/category/" + k.slug as any}
                onClick={onNavigate}
                className="text-[13px] text-muted-foreground hover:text-primary hover:translate-x-0.5 inline-block transition"
              >
                {k.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


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

  // CMS pages flagged "Show in Header" become clean-URL menu entries (/slug).
  const { data: headerPages } = useQuery({
    queryKey: ["pages", "header"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pages")
        .select("id,title,slug,menu_order")
        .eq("is_published", true)
        .eq("show_in_header", true)
        .order("menu_order")
        .order("title");
      return data ?? [];
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
            <Link to="/" className="text-foreground/80 hover:text-primary transition-colors">Home</Link>
            <CategoriesMenu />
            <Link to="/shop" className="text-foreground/80 hover:text-primary transition-colors">Shop</Link>
            <Link to="/about" className="text-foreground/80 hover:text-primary transition-colors">About</Link>
            <Link to="/blog" className="text-foreground/80 hover:text-primary transition-colors">Blog</Link>
            <Link to="/faq" className="text-foreground/80 hover:text-primary transition-colors">FAQ</Link>
            <Link to="/contact" className="text-foreground/80 hover:text-primary transition-colors">Contact</Link>
            {(headerPages ?? [])
              .filter((p) => !["about", "contact", "blog", "faq", "shop", "home", "categories", ""].includes(p.slug))
              .map((p) => (
                <Link key={p.id} to={"/" + p.slug as any} className="text-foreground/80 hover:text-primary transition-colors">
                  {p.title}
                </Link>
              ))}
            {items
              .filter((m) => !["home","shop","about","blog","faq","contact","categories"].includes(m.label.trim().toLowerCase()))
              .map((m) => (
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
            <UserMenu />

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
              <Link to="/" onClick={() => setMobileOpen(false)} className="py-2">Home</Link>
              <Link to="/shop" onClick={() => setMobileOpen(false)} className="py-2">Shop</Link>
              <Link to="/about" onClick={() => setMobileOpen(false)} className="py-2">About</Link>
              <Link to="/contact" onClick={() => setMobileOpen(false)} className="py-2">Contact</Link>
              <Link to="/blog" onClick={() => setMobileOpen(false)} className="py-2">Blog</Link>
              <Link to="/faq" onClick={() => setMobileOpen(false)} className="py-2">FAQ</Link>
              {(headerPages ?? [])
                .filter((p) => !["about", "contact", "blog", "faq", "shop", "home", "categories", ""].includes(p.slug))
                .map((p) => (
                  <Link key={p.id} to={"/" + p.slug as any} onClick={() => setMobileOpen(false)} className="py-2">
                    {p.title}
                  </Link>
                ))}
              {items
                .filter((m) => !["home","shop","about","blog","faq","contact","categories"].includes(m.label.trim().toLowerCase()))
                .map((m) => (
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
