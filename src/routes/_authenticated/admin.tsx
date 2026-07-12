import { createFileRoute, Link, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useEffect } from "react";
import { LayoutDashboard, Package, ShoppingCart, Tag, FolderTree, Sparkles, FileText, Settings, LogOut, Home, ImageIcon, Boxes, Ticket, Zap, Truck, Receipt, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

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

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/brands", label: "Brands", icon: Tag },
  { to: "/admin/media", label: "Media", icon: ImageIcon },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/flash-sales", label: "Flash Sales", icon: Zap },
  { to: "/admin/shipping", label: "Shipping", icon: Truck },
  { to: "/admin/taxes", label: "Taxes", icon: Receipt },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/home-sections", label: "Homepage", icon: Sparkles },
  { to: "/admin/pages", label: "CMS Pages", icon: FileText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

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
        <nav className="flex-1 py-4">
          {NAV.map((item) => {
            const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 text-sm border-l-2 transition-colors",
                  active ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon size={16} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <Link to="/" className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary py-2"><Home size={14} /> View store</Link>
          <button onClick={signOut} className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive py-2 w-full"><LogOut size={14} /> Sign out</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
