import { createFileRoute, Link, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useEffect } from "react";
import { LayoutDashboard, Package, ShoppingCart, Tag, FolderTree, Sparkles, FileText, Settings, LogOut, Home, ImageIcon, Boxes, Ticket, Zap, Truck, Receipt, CreditCard, Star, MessageSquare, Undo2, Users, UsersRound, Building2, Warehouse, ClipboardList, Rss, HelpCircle, MegaphoneIcon, Mail, Inbox, Send, ShieldCheck, Webhook, KeyRound, ChevronDown, Menu as MenuIcon, Share2, Bell, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { NotificationBell } from "@/components/admin/notification-bell";
import { ThemeToggle } from "@/components/site/theme-toggle";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    const ok = roles?.some((r) => r.role === "admin" || r.role === "staff");
    if (!ok) throw redirect({ to: "/" });
    return { user: userData.user };
  },
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: any; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  ]},
  { label: "Catalog", items: [
    { to: "/admin/products", label: "Products", icon: Package },
    { to: "/admin/inventory", label: "Inventory", icon: Boxes },
    { to: "/admin/categories", label: "Categories", icon: FolderTree },
    { to: "/admin/brands", label: "Brands", icon: Tag },
    { to: "/admin/media", label: "Media", icon: ImageIcon },
  ]},
  { label: "Sales", items: [
    { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { to: "/admin/returns", label: "Returns", icon: Undo2 },
    { to: "/admin/coupons", label: "Coupons", icon: Ticket },
    { to: "/admin/flash-sales", label: "Flash Sales", icon: Zap },
    { to: "/admin/shipping", label: "Shipping", icon: Truck },
    { to: "/admin/taxes", label: "Taxes", icon: Receipt },
    { to: "/admin/payments", label: "Payments", icon: CreditCard },
  ]},
  { label: "Customers", items: [
    { to: "/admin/customers", label: "Customers", icon: Users },
    { to: "/admin/customer-groups", label: "Groups", icon: UsersRound },
    { to: "/admin/reviews", label: "Reviews", icon: Star },
    { to: "/admin/qa", label: "Q&A", icon: MessageSquare },
  ]},
  { label: "Operations", items: [
    { to: "/admin/suppliers", label: "Suppliers", icon: Building2 },
    { to: "/admin/warehouses", label: "Warehouses", icon: Warehouse },
    { to: "/admin/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
  ]},
  { label: "Content", items: [
    { to: "/admin/hero-slides", label: "Hero Banner", icon: Sparkles },
    { to: "/admin/home-sections", label: "Homepage", icon: Sparkles },
    { to: "/admin/menus", label: "Menus", icon: MenuIcon },
    { to: "/admin/pages", label: "CMS Pages", icon: FileText },
    { to: "/admin/blog", label: "Blog", icon: Rss },
    { to: "/admin/faqs", label: "FAQs", icon: HelpCircle },
    { to: "/admin/popups", label: "Popups", icon: MegaphoneIcon },
  ]},
  { label: "Marketing", items: [
    { to: "/admin/newsletter", label: "Newsletter", icon: Send },
    { to: "/admin/email-templates", label: "Email Templates", icon: Mail },
    { to: "/admin/contact", label: "Contact Inbox", icon: Inbox },
    { to: "/admin/social", label: "Social & WhatsApp", icon: Share2 },
    { to: "/admin/notifications", label: "Notifications", icon: Bell },
    { to: "/admin/notification-sounds", label: "Notification Sounds", icon: Volume2 },
  ]},
  { label: "Platform", items: [
    { to: "/admin/webhooks", label: "Webhooks", icon: Webhook },
    { to: "/admin/api-keys", label: "API Keys", icon: KeyRound },
    { to: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck },
    { to: "/admin/theme", label: "Theme", icon: Sparkles },
    { to: "/admin/smtp", label: "SMTP", icon: Send },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ]},
];

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
    const scroller = document.querySelector("main.flex-1");
    if (scroller) (scroller as HTMLElement).scrollTop = 0;
  }, [location.pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/" className="text-xl font-serif tracking-[0.3em] text-primary">AURELIA</Link>
          <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mt-1">Admin</div>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-2">
              <div className="px-6 pt-3 pb-1 text-[9px] uppercase tracking-[0.28em] text-muted-foreground/60">{group.label}</div>
              {group.items.map((item) => {
                const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    className={cn(
                      "flex items-center gap-3 px-6 py-2 text-sm border-l-2 transition-colors",
                      active ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon size={14} /> {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <Link to="/" className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary py-2"><Home size={14} /> View store</Link>
          <button onClick={signOut} className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive py-2 w-full"><LogOut size={14} /> Sign out</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-border bg-background/85 backdrop-blur px-6 h-14">
          <ThemeToggle />
          <NotificationBell />
        </div>
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
