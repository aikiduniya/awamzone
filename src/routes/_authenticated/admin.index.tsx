import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import {
  DollarSign, Package, ShoppingCart, Users, TrendingUp, PackageX,
  AlertTriangle, Undo2, RefreshCcw, Clock, Target, CalendarDays,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

type StatCard = {
  label: string; value: string | number; icon: any; tint: string; hint?: string; to?: string;
};

function Card({ c }: { c: StatCard }) {
  const Icon = c.icon;
  const body = (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition hover:shadow-lg hover:-translate-y-0.5 h-full">
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl ${c.tint}`} />
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{c.label}</div>
        <div className={`h-9 w-9 rounded-lg inline-flex items-center justify-center text-white ${c.tint}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-serif">{c.value}</div>
      {c.hint && <div className="mt-1 text-xs text-muted-foreground">{c.hint}</div>}
    </div>
  );
  if (c.to) return <Link to={c.to as any} className="block">{body}</Link>;
  return body;
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin-dashboard"],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const now = new Date();
      const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      const [
        ordersHead, productsHead, customersHead,
        todayOrders, monthOrders, sixMonth,
        pendingOrders, lowStock, outStock, returnsHead,
        recentOrders, recentCustomers, orderItems,
      ] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total,status").gte("created_at", startOfDay.toISOString()),
        supabase.from("orders").select("total,status").gte("created_at", startOfMonth.toISOString()),
        supabase.from("orders").select("total,status,created_at").gte("created_at", sixMonthsAgo.toISOString()).order("created_at"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("products").select("id,name,stock,low_stock_threshold").gt("stock", 0).limit(200),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("stock", 0),
        supabase.from("return_requests").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("id,order_number,email,total,status,created_at").order("created_at", { ascending: false }).limit(6),
        supabase.from("profiles").select("id,full_name,created_at").order("created_at", { ascending: false }).limit(6),
        supabase.from("order_items").select("product_id,product_name,quantity,total").limit(500),
      ]);

      const sum = (rows?: any[]) => (rows ?? []).filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total || 0), 0);
      const todaySales = sum(todayOrders.data ?? undefined);
      const monthRevenue = sum(monthOrders.data ?? undefined);
      const conv = customersHead.count && customersHead.count > 0 ? ((ordersHead.count ?? 0) / customersHead.count) * 100 : 0;

      const lowCount = (lowStock.data ?? []).filter((p: any) => p.stock <= (p.low_stock_threshold ?? 5)).length;

      // Chart data: monthly sales/revenue/orders
      const months: Record<string, { key: string; label: string; revenue: number; orders: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        months[key] = { key, label: d.toLocaleString(undefined, { month: "short" }), revenue: 0, orders: 0 };
      }
      (sixMonth.data ?? []).forEach((o: any) => {
        if (o.status === "cancelled") return;
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        if (months[key]) {
          months[key].revenue += Number(o.total || 0);
          months[key].orders += 1;
        }
      });
      const chartMonthly = Object.values(months);

      // Orders by day (last 14)
      const days: Record<string, { label: string; orders: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const k = d.toISOString().slice(0, 10);
        days[k] = { label: `${d.getMonth() + 1}/${d.getDate()}`, orders: 0 };
      }
      (sixMonth.data ?? []).forEach((o: any) => {
        const k = new Date(o.created_at).toISOString().slice(0, 10);
        if (days[k] && o.status !== "cancelled") days[k].orders += 1;
      });
      const chartDaily = Object.values(days);

      // Top products & categories from order_items
      const productTotals: Record<string, { name: string; total: number }> = {};
      const catTotals: Record<string, number> = {};
      (orderItems.data ?? []).forEach((it: any) => {
        const key = it.product_id ?? it.product_name;
        if (!productTotals[key]) productTotals[key] = { name: it.product_name ?? "Unknown", total: 0 };
        productTotals[key].total += Number(it.total || 0);
      });

      const topProducts = Object.values(productTotals).sort((a, b) => b.total - a.total).slice(0, 6);

      return {
        counts: {
          orders: ordersHead.count ?? 0,
          products: productsHead.count ?? 0,
          customers: customersHead.count ?? 0,
          pending: pendingOrders.count ?? 0,
          out: outStock.count ?? 0,
          low: lowCount,
          returns: returnsHead.count ?? 0,
        },
        todaySales,
        monthRevenue,
        totalRevenue: sum(sixMonth.data ?? undefined),
        conv,
        chartMonthly,
        chartDaily,
        topProducts,
        recentOrders: recentOrders.data ?? [],
        recentCustomers: recentCustomers.data ?? [],
      };
    },
  });

  const cards: StatCard[] = useMemo(() => [
    { label: "Today's Sales", value: formatMoney(data?.todaySales ?? 0), icon: DollarSign, tint: "bg-emerald-500", hint: "Since midnight", to: "/admin/orders" },
    { label: "Monthly Revenue", value: formatMoney(data?.monthRevenue ?? 0), icon: TrendingUp, tint: "bg-blue-500", hint: "This month", to: "/admin/orders" },
    { label: "Orders", value: data?.counts.orders ?? 0, icon: ShoppingCart, tint: "bg-indigo-500", to: "/admin/orders" },
    { label: "Customers", value: data?.counts.customers ?? 0, icon: Users, tint: "bg-fuchsia-500", to: "/admin/customers" },
    { label: "Products", value: data?.counts.products ?? 0, icon: Package, tint: "bg-violet-500", to: "/admin/products" },
    { label: "Pending Orders", value: data?.counts.pending ?? 0, icon: Clock, tint: "bg-amber-500", to: "/admin/orders" },
    { label: "Low Stock", value: data?.counts.low ?? 0, icon: AlertTriangle, tint: "bg-orange-500", to: "/admin/inventory" },
    { label: "Out of Stock", value: data?.counts.out ?? 0, icon: PackageX, tint: "bg-rose-500", to: "/admin/inventory" },
    { label: "Returns", value: data?.counts.returns ?? 0, icon: Undo2, tint: "bg-red-500", to: "/admin/returns" },
    { label: "Refunds", value: 0, icon: RefreshCcw, tint: "bg-pink-500", to: "/admin/returns" },
    { label: "Revenue (6mo)", value: formatMoney(data?.totalRevenue ?? 0), icon: CalendarDays, tint: "bg-teal-500", to: "/admin/orders" },
    { label: "Conversion", value: `${(data?.conv ?? 0).toFixed(1)}%`, icon: Target, tint: "bg-cyan-500", hint: "Orders / Customers" },
  ], [data]);

  const pieColors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <>
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground mb-1">Overview</div>
        <h1 className="text-3xl md:text-4xl font-serif">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => <Card key={c.label} c={c} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg">Revenue — last 6 months</h3>
            <span className="text-xs text-muted-foreground">Line</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.chartMonthly ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg">Orders — last 6 months</h3>
            <span className="text-xs text-muted-foreground">Bar</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.chartMonthly ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="orders" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg">Orders per day — last 14 days</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.chartDaily ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="orders" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg">Top selling</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.topProducts ?? []} dataKey="total" nameKey="name" outerRadius={70} innerRadius={38}>
                  {(data?.topProducts ?? []).map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatMoney(Number(v))} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-serif text-lg">Latest orders</h3>
            <Link to="/admin/orders" className="text-xs uppercase tracking-[0.2em] text-primary hover:underline">View all</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Status</th><th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentOrders ?? []).map((o) => (
                <tr key={o.id} className="border-t border-border/60">
                  <td className="p-3 font-mono text-primary">{o.order_number}</td>
                  <td className="p-3 truncate max-w-[160px]">{o.email}</td>
                  <td className="p-3 text-[10px] uppercase tracking-[0.2em]">{o.status}</td>
                  <td className="p-3 text-right">{formatMoney(o.total)}</td>
                </tr>
              ))}
              {(data?.recentOrders ?? []).length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-serif text-lg">Latest customers</h3>
            <Link to="/admin/customers" className="text-xs uppercase tracking-[0.2em] text-primary hover:underline">View all</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th className="p-3">Name</th><th className="p-3 text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentCustomers ?? []).map((c) => (
                <tr key={c.id} className="border-t border-border/60">
                  <td className="p-3">{c.full_name ?? "—"}</td>
                  <td className="p-3 text-right text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {(data?.recentCustomers ?? []).length === 0 && (
                <tr><td colSpan={2} className="p-6 text-center text-muted-foreground">No customers yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
