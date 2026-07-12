import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import { DollarSign, Package, ShoppingCart, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [orders, products, users, ordersList] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total, status, created_at, order_number, id, email").order("created_at", { ascending: false }).limit(10),
      ]);
      const revenue = (ordersList.data ?? []).filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
      return {
        orderCount: orders.count ?? 0,
        productCount: products.count ?? 0,
        userCount: users.count ?? 0,
        revenue,
        recent: ordersList.data ?? [],
      };
    },
  });

  const cards = [
    { label: "Revenue", value: formatMoney(stats?.revenue ?? 0), icon: DollarSign },
    { label: "Orders", value: stats?.orderCount ?? 0, icon: ShoppingCart },
    { label: "Products", value: stats?.productCount ?? 0, icon: Package },
    { label: "Customers", value: stats?.userCount ?? 0, icon: Users },
  ];

  return (
    <>
      <div className="eyebrow mb-2">Overview</div>
      <h1 className="text-4xl font-serif mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="border border-border p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{c.label}</div>
                <Icon size={16} className="text-primary" />
              </div>
              <div className="text-3xl font-serif text-primary">{c.value}</div>
            </div>
          );
        })}
      </div>

      <div className="border border-border">
        <div className="p-6 border-b border-border eyebrow">Recent Orders</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground eyebrow">
              <th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4">Status</th><th className="p-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {stats?.recent.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-4 font-mono text-primary">{o.order_number}</td>
                <td className="p-4">{o.email}</td>
                <td className="p-4 text-xs uppercase tracking-[0.2em]">{o.status}</td>
                <td className="p-4 text-right">{formatMoney(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
