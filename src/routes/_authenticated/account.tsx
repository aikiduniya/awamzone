import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user } = useSession();
  const navigate = useNavigate();

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("orders").select("id, order_number, status, total, created_at").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: wishlist } = useQuery({
    queryKey: ["my-wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("wishlists").select("product_id, products(id, name, slug, price, sale_price, images)").eq("user_id", user!.id)).data ?? [],
  });

  const { data: adminInfo, refetch: refetchAdmin } = useQuery({
    queryKey: ["admin-status"],
    queryFn: async () => {
      const [{ data: statusRows }, { data: myRoles }] = await Promise.all([
        supabase.rpc("admin_status"),
        user ? supabase.from("user_roles").select("role").eq("user_id", user.id) : Promise.resolve({ data: [] as any[] }),
      ]);
      return {
        hasAdmin: !!statusRows?.[0]?.has_admin,
        isAdmin: !!myRoles?.some((r: any) => r.role === "admin" || r.role === "staff"),
      };
    },
    enabled: !!user,
  });

  const claimAdmin = async () => {
    const { data, error } = await supabase.rpc("claim_first_admin");
    if (error) return toast.error(error.message);
    if (data) { toast.success("You're now the admin."); refetchAdmin(); }
    else toast.error("Admin already assigned.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <SiteShell>
      <div className="container-luxe py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="eyebrow mb-2">Members</div>
            <h1 className="text-5xl font-serif">Welcome, {user?.email}</h1>
          </div>
          <button onClick={signOut} className="text-xs uppercase tracking-[0.24em] text-muted-foreground hover:text-primary">Sign out</button>
        </div>

        {adminInfo && !adminInfo.hasAdmin && !adminInfo.isAdmin && (
          <div className="border border-primary/50 bg-primary/5 p-6 mb-10">
            <div className="eyebrow mb-2 text-primary">Store setup</div>
            <p className="text-sm mb-4">No admin exists yet. Claim admin access to manage this store.</p>
            <button onClick={claimAdmin} className="border border-primary bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.24em]">Claim admin</button>
          </div>
        )}
        {adminInfo?.isAdmin && (
          <div className="mb-10 flex items-center gap-3">
            <span className="eyebrow text-primary">You are an admin</span>
            <Link to="/admin" className="border border-primary text-primary px-4 py-2 text-xs uppercase tracking-[0.24em] hover:bg-primary hover:text-primary-foreground transition">Go to admin</Link>
          </div>
        )}

        <section className="mb-16">
          <h2 className="text-2xl font-serif mb-6">Recent Orders</h2>
          {orders?.length ? (
            <div className="border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface"><tr>
                  <th className="text-left p-4 eyebrow">Order</th>
                  <th className="text-left p-4 eyebrow">Date</th>
                  <th className="text-left p-4 eyebrow">Status</th>
                  <th className="text-right p-4 eyebrow">Total</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="p-4 font-mono text-primary">{o.order_number}</td>
                      <td className="p-4 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="p-4"><span className="text-xs uppercase tracking-[0.2em]">{o.status}</span></td>
                      <td className="p-4 text-right">{formatMoney(o.total)}</td>
                      <td className="p-4 text-right"><Link to="/order/$id" params={{ id: o.id }} className="text-primary text-xs uppercase tracking-[0.2em]">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-muted-foreground">No orders yet.</p>}
        </section>

        <section>
          <h2 className="text-2xl font-serif mb-6">Wishlist</h2>
          {wishlist?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {wishlist.map((w: any) => w.products && (
                <Link to="/product/$slug" params={{ slug: w.products.slug }} key={w.product_id} className="group">
                  <div className="aspect-[4/5] bg-surface overflow-hidden">
                    <img src={w.products.images?.[0]} alt="" className="h-full w-full object-cover group-hover:scale-105 transition duration-700" />
                  </div>
                  <div className="mt-2 font-serif">{w.products.name}</div>
                  <div className="text-primary text-sm">{formatMoney(w.products.sale_price ?? w.products.price)}</div>
                </Link>
              ))}
            </div>
          ) : <p className="text-muted-foreground">Your wishlist is empty.</p>}
        </section>
      </div>
    </SiteShell>
  );
}
