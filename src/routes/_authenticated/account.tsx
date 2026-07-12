import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

type Tab = "overview" | "profile" | "addresses" | "orders" | "wishlist" | "preferences" | "security";

function AccountPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

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

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "profile", label: "Profile" },
    { id: "addresses", label: "Addresses" },
    { id: "orders", label: "Orders" },
    { id: "wishlist", label: "Wishlist" },
    { id: "preferences", label: "Preferences" },
    { id: "security", label: "Security" },
  ];

  return (
    <SiteShell>
      <div className="container-luxe py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="eyebrow mb-2">My Account</div>
            <h1 className="text-4xl md:text-5xl font-serif">Welcome, {user?.email}</h1>
          </div>
          <button onClick={signOut} className="text-xs uppercase tracking-[0.24em] text-muted-foreground hover:text-primary">Sign out</button>
        </div>

        {adminInfo && !adminInfo.hasAdmin && !adminInfo.isAdmin && (
          <div className="border border-primary/50 bg-primary/5 p-6 mb-8">
            <div className="eyebrow mb-2 text-primary">Store setup</div>
            <p className="text-sm mb-4">No admin exists yet. Claim admin access to manage this store.</p>
            <button onClick={claimAdmin} className="border border-primary bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.24em]">Claim admin</button>
          </div>
        )}
        {adminInfo?.isAdmin && (
          <div className="mb-8 flex items-center gap-3">
            <span className="eyebrow text-primary">You are an admin</span>
            <Link to="/admin" className="border border-primary text-primary px-4 py-2 text-xs uppercase tracking-[0.24em] hover:bg-primary hover:text-primary-foreground transition">Go to admin</Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
          <nav className="flex md:flex-col gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`text-left px-4 py-2 text-xs uppercase tracking-[0.24em] border-l-2 whitespace-nowrap ${tab === t.id ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div>
            {tab === "overview" && <OverviewTab orders={orders ?? []} wishlist={wishlist ?? []} />}
            {tab === "profile" && <ProfileTab />}
            {tab === "addresses" && <AddressesTab />}
            {tab === "orders" && <OrdersTab orders={orders ?? []} />}
            {tab === "wishlist" && <WishlistTab wishlist={wishlist ?? []} />}
            {tab === "preferences" && <PreferencesTab />}
            {tab === "security" && <SecurityTab />}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

function OverviewTab({ orders, wishlist }: { orders: any[]; wishlist: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="border border-border p-6">
        <div className="eyebrow mb-2">Orders</div>
        <div className="text-3xl font-serif">{orders.length}</div>
      </div>
      <div className="border border-border p-6">
        <div className="eyebrow mb-2">Wishlist</div>
        <div className="text-3xl font-serif">{wishlist.length}</div>
      </div>
      <div className="border border-border p-6">
        <div className="eyebrow mb-2">Spent</div>
        <div className="text-3xl font-serif">{formatMoney(orders.reduce((s, o) => s + Number(o.total ?? 0), 0))}</div>
      </div>
    </div>
  );
}

function OrdersTab({ orders }: { orders: any[] }) {
  if (!orders.length) return <p className="text-muted-foreground">No orders yet.</p>;
  return (
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
              <td className="p-4 text-right space-x-3">
                <Link to="/order/$id" params={{ id: o.id }} className="text-primary text-xs uppercase tracking-[0.2em]">View</Link>
                <Link to="/invoice/$orderId" params={{ orderId: o.id }} className="text-muted-foreground hover:text-primary text-xs uppercase tracking-[0.2em]">Invoice</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WishlistTab({ wishlist }: { wishlist: any[] }) {
  if (!wishlist.length) return <p className="text-muted-foreground">Your wishlist is empty.</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {wishlist.map((w: any) => w.products && (
        <Link to="/product/$slug" params={{ slug: w.products.slug }} key={w.product_id} className="group">
          <div className="aspect-[4/5] bg-surface overflow-hidden">
            <img src={w.products.images?.[0]} alt={w.products.name} className="h-full w-full object-cover group-hover:scale-105 transition duration-700" />
          </div>
          <div className="mt-2 font-serif">{w.products.name}</div>
          <div className="text-primary text-sm">{formatMoney(w.products.sale_price ?? w.products.price)}</div>
        </Link>
      ))}
    </div>
  );
}

function ProfileTab() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (profile) setForm(profile); }, [profile]);

  const [uploading, setUploading] = useState(false);
  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `avatars/${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("media").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: signed } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365);
    const url = signed?.signedUrl ?? "";
    setForm({ ...form, avatar_url: url });
    setUploading(false);
  };

  const save = async () => {
    if (!user) return;
    const payload = {
      full_name: form.full_name || null,
      phone: form.phone || null,
      avatar_url: form.avatar_url || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["my-profile"] });
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-surface border border-border">
          {form.avatar_url ? <img src={form.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-2xl font-serif text-muted-foreground">{(form.full_name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}</div>}
        </div>
        <label className="text-xs uppercase tracking-[0.2em] cursor-pointer text-primary">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && uploadAvatar(e.target.files[0])} />
          {uploading ? "Uploading…" : "Change photo"}
        </label>
      </div>
      <Input placeholder="Full name" value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      <Input placeholder="Email" value={user?.email ?? ""} disabled />
      <Input placeholder="Phone" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <Input type="date" placeholder="Date of birth" value={form.date_of_birth ?? ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
      <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.gender ?? ""} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
        <option value="">Gender (prefer not to say)</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
        <option value="non_binary">Non-binary</option>
        <option value="other">Other</option>
      </select>
      <Button onClick={save}>Save profile</Button>
    </div>
  );
}

function AddressesTab() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: addresses = [] } = useQuery({
    queryKey: ["my-addresses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("addresses").select("*").eq("user_id", user!.id).order("created_at")).data ?? [],
  });

  const [form, setForm] = useState<any>({ address_type: "both" });
  const [editing, setEditing] = useState<string | null>(null);

  const empty = () => setForm({ address_type: "both" });

  const save = async () => {
    if (!user) return;
    if (!form.full_name || !form.line1 || !form.city || !form.country) return toast.error("Fill name, address, city, country");
    const payload = {
      user_id: user.id,
      label: form.label || null,
      full_name: form.full_name,
      phone: form.phone || null,
      line1: form.line1,
      line2: form.line2 || null,
      city: form.city,
      state: form.state || null,
      postal_code: form.postal_code || null,
      country: form.country,
      address_type: form.address_type || "both",
      is_default_shipping: !!form.is_default_shipping,
      is_default_billing: !!form.is_default_billing,
    };
    if (form.is_default_shipping) await supabase.from("addresses").update({ is_default_shipping: false }).eq("user_id", user.id);
    if (form.is_default_billing) await supabase.from("addresses").update({ is_default_billing: false }).eq("user_id", user.id);
    const { error } = editing
      ? await supabase.from("addresses").update(payload).eq("id", editing)
      : await supabase.from("addresses").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Address saved");
    empty(); setEditing(null);
    qc.invalidateQueries({ queryKey: ["my-addresses"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    await supabase.from("addresses").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-addresses"] });
  };

  const edit = (a: any) => {
    setEditing(a.id);
    setForm(a);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-3">
        {addresses.length === 0 && <p className="text-muted-foreground">No saved addresses yet.</p>}
        {addresses.map((a: any) => (
          <div key={a.id} className="border border-border p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{a.label || a.full_name}</div>
                <div className="text-sm text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}{a.state ? `, ${a.state}` : ""} {a.postal_code}, {a.country}</div>
                <div className="mt-2 flex gap-2 text-[10px] uppercase tracking-[0.2em]">
                  {a.is_default_shipping && <span className="text-primary flex items-center gap-1"><Star size={10} /> Default shipping</span>}
                  {a.is_default_billing && <span className="text-primary flex items-center gap-1"><Star size={10} /> Default billing</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => edit(a)} className="text-xs text-primary uppercase tracking-[0.2em]">Edit</button>
                <button onClick={() => remove(a.id)} className="text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-border p-5 space-y-3 h-fit">
        <div className="eyebrow">{editing ? "Edit address" : "Add address"}</div>
        <Input placeholder="Label (Home, Office…)" value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        <Input placeholder="Full name" value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <Input placeholder="Phone" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input placeholder="Address line 1" value={form.line1 ?? ""} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
        <Input placeholder="Address line 2" value={form.line2 ?? ""} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="City" value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input placeholder="State/Region" value={form.state ?? ""} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <Input placeholder="Postal code" value={form.postal_code ?? ""} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
          <Input placeholder="Country (2-letter)" maxLength={2} value={form.country ?? ""} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} />
        </div>
        <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.address_type ?? "both"} onChange={(e) => setForm({ ...form, address_type: e.target.value })}>
          <option value="both">Shipping & Billing</option>
          <option value="shipping">Shipping only</option>
          <option value="billing">Billing only</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_default_shipping} onChange={(e) => setForm({ ...form, is_default_shipping: e.target.checked })} /> Default shipping</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_default_billing} onChange={(e) => setForm({ ...form, is_default_billing: e.target.checked })} /> Default billing</label>
        <div className="flex gap-2">
          <Button onClick={save} className="flex-1"><Plus size={14} className="mr-1" /> {editing ? "Update" : "Add"}</Button>
          {editing && <Button variant="outline" onClick={() => { setEditing(null); empty(); }}>Cancel</Button>}
        </div>
      </div>
    </div>
  );
}

function PreferencesTab() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });
  const [prefs, setPrefs] = useState<any>({});
  useEffect(() => { if (profile) setPrefs(profile); }, [profile]);
  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      email_marketing: !!prefs.email_marketing,
      email_orders: !!prefs.email_orders,
      email_product_news: !!prefs.email_product_news,
    }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Preferences updated");
    qc.invalidateQueries({ queryKey: ["my-profile"] });
  };
  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">Choose which emails you'd like to receive.</p>
      <label className="flex items-start gap-3 border border-border p-4 cursor-pointer">
        <input type="checkbox" checked={!!prefs.email_orders} onChange={(e) => setPrefs({ ...prefs, email_orders: e.target.checked })} className="mt-1" />
        <div><div className="font-medium">Order updates</div><div className="text-xs text-muted-foreground">Order confirmations, shipping, delivery.</div></div>
      </label>
      <label className="flex items-start gap-3 border border-border p-4 cursor-pointer">
        <input type="checkbox" checked={!!prefs.email_marketing} onChange={(e) => setPrefs({ ...prefs, email_marketing: e.target.checked })} className="mt-1" />
        <div><div className="font-medium">Offers & promotions</div><div className="text-xs text-muted-foreground">Sales, coupons, seasonal picks.</div></div>
      </label>
      <label className="flex items-start gap-3 border border-border p-4 cursor-pointer">
        <input type="checkbox" checked={!!prefs.email_product_news} onChange={(e) => setPrefs({ ...prefs, email_product_news: e.target.checked })} className="mt-1" />
        <div><div className="font-medium">Product news</div><div className="text-xs text-muted-foreground">New arrivals and back-in-stock alerts.</div></div>
      </label>
      <Button onClick={save}>Save preferences</Button>
    </div>
  );
}

function SecurityTab() {
  const { user } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const change = async () => {
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPassword(""); setConfirm("");
  };
  const deleteAccount = async () => {
    if (!confirm) return;
    if (!window.confirm("Are you absolutely sure? This action cannot be undone.")) return;
    if (!user) return;
    // Sign out; a request row will be created for admin review.
    await supabase.from("audit_logs").insert({ actor_id: user.id, action: "account.delete_requested", entity_type: "profile", entity_id: user.id } as any);
    await supabase.auth.signOut();
    toast.success("Account deletion requested. Our team will process it within 30 days.");
    window.location.href = "/";
  };
  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-3">
        <div className="eyebrow">Change password</div>
        <Input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button onClick={change} disabled={saving}>{saving ? "Updating…" : "Update password"}</Button>
      </div>
      <div className="space-y-3 border-t border-border pt-6">
        <div className="eyebrow text-destructive">Danger zone</div>
        <p className="text-xs text-muted-foreground">Request permanent deletion of your account and all associated data.</p>
        <Button variant="destructive" onClick={deleteAccount}>Delete my account</Button>
      </div>
    </div>
  );
}
