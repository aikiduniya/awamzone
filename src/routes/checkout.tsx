import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/site-header";
import { useCart } from "@/hooks/use-cart";
import { useSession } from "@/hooks/use-session";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { effectivePrice, formatMoney } from "@/lib/format";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout | AURELIA" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { user } = useSession();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);

  const [form, setForm] = useState({
    email: user?.email ?? "",
    full_name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "USA",
    notes: "",
  });

  const [shippingId, setShippingId] = useState<string>("");
  const [paymentCode, setPaymentCode] = useState<string>("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<any>(null);

  const { data: shipping } = useQuery({
    queryKey: ["shipping-methods"],
    queryFn: async () => (await supabase.from("shipping_methods").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });
  const { data: payments } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => (await supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });

  const shippingMethod = shipping?.find((s) => s.id === shippingId) ?? shipping?.[0];
  const shippingCost = useMemo(() => {
    if (!shippingMethod) return 0;
    if (shippingMethod.free_over && subtotal >= Number(shippingMethod.free_over)) return 0;
    return Number(shippingMethod.cost);
  }, [shippingMethod, subtotal]);

  const discount = useMemo(() => {
    if (!coupon) return 0;
    if (coupon.type === "percent") return (subtotal * Number(coupon.value)) / 100;
    if (coupon.type === "fixed") return Number(coupon.value);
    if (coupon.type === "free_shipping") return shippingCost;
    return 0;
  }, [coupon, subtotal, shippingCost]);

  const total = Math.max(0, subtotal + shippingCost - discount);

  const applyCoupon = async () => {
    if (!couponCode) return;
    const { data } = await supabase.from("coupons").select("*").eq("code", couponCode.toUpperCase()).eq("is_active", true).maybeSingle();
    if (!data) { toast.error("Invalid coupon."); return; }
    if (data.min_purchase && subtotal < Number(data.min_purchase)) { toast.error(`Minimum ${formatMoney(data.min_purchase)}`); return; }
    setCoupon(data);
    toast.success("Coupon applied");
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!paymentCode) { toast.error("Choose a payment method"); return; }
    setPlacing(true);
    try {
      const orderPayload: any = {
        user_id: user?.id ?? null,
        email: form.email,
        subtotal,
        discount,
        shipping_cost: shippingCost,
        tax: 0,
        total,
        payment_method: paymentCode,
        payment_status: paymentCode === "cod" ? "pending" : "pending",
        status: "pending",
        currency: "USD",
        coupon_code: coupon?.code ?? null,
        shipping_address: {
          full_name: form.full_name, phone: form.phone,
          line1: form.line1, line2: form.line2, city: form.city, state: form.state, postal_code: form.postal_code, country: form.country
        },
        notes: form.notes,
        timeline: [{ status: "pending", at: new Date().toISOString(), note: "Order placed" }],
      };
      const { data: order, error } = await supabase.from("orders").insert(orderPayload).select().single();
      if (error) throw error;

      const orderItems = items.filter((it: any) => it.product).map((it: any) => {
        const price = effectivePrice(it.product);
        return {
          order_id: order.id,
          product_id: it.product.id,
          product_name: it.product.name,
          product_image: it.product.images?.[0] ?? null,
          quantity: it.quantity,
          unit_price: price,
          total: price * it.quantity,
        };
      });
      await supabase.from("order_items").insert(orderItems);
      await clear.mutateAsync();
      toast.success("Order placed!");
      navigate({ to: "/order/$id", params: { id: order.id } });
    } catch (err: any) {
      toast.error(err.message || "Couldn't place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SiteShell>
      <div className="container-luxe py-16">
        <div className="eyebrow mb-2">Almost there</div>
        <h1 className="text-5xl font-serif mb-10">Checkout</h1>

        <form onSubmit={placeOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="text-2xl font-serif mb-4">Contact</h2>
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-transparent border border-border px-4 py-3" />
            </section>

            <section>
              <h2 className="text-2xl font-serif mb-4">Shipping Address</h2>
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="col-span-2 bg-transparent border border-border px-4 py-3" />
                <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="col-span-2 bg-transparent border border-border px-4 py-3" />
                <input required placeholder="Address line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className="col-span-2 bg-transparent border border-border px-4 py-3" />
                <input placeholder="Address line 2" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="col-span-2 bg-transparent border border-border px-4 py-3" />
                <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-transparent border border-border px-4 py-3" />
                <input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="bg-transparent border border-border px-4 py-3" />
                <input placeholder="Postal code" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="bg-transparent border border-border px-4 py-3" />
                <input required placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="bg-transparent border border-border px-4 py-3" />
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-serif mb-4">Shipping Method</h2>
              <div className="space-y-2">
                {shipping?.map((s) => (
                  <label key={s.id} className={`flex items-center justify-between border p-4 cursor-pointer ${(shippingId || shipping[0]?.id) === s.id ? "border-primary" : "border-border"}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="shipping" checked={(shippingId || shipping[0]?.id) === s.id} onChange={() => setShippingId(s.id)} className="accent-primary" />
                      <div>
                        <div>{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.description}</div>
                      </div>
                    </div>
                    <div>{Number(s.cost) === 0 || (s.free_over && subtotal >= Number(s.free_over)) ? "Free" : formatMoney(s.cost)}</div>
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-serif mb-4">Payment</h2>
              <div className="space-y-2">
                {payments?.map((p) => (
                  <label key={p.id} className={`block border p-4 cursor-pointer ${paymentCode === p.code ? "border-primary" : "border-border"}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment" checked={paymentCode === p.code} onChange={() => setPaymentCode(p.code)} className="accent-primary" />
                      <div className="flex-1">
                        <div>{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                        {paymentCode === p.code && p.instructions && (
                          <div className="mt-2 text-xs text-muted-foreground bg-surface p-3">{p.instructions}</div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {paymentCode === "stripe" && (
                <p className="mt-3 text-xs text-muted-foreground">Stripe test mode — no real payment will be charged. Live payments can be enabled from the admin panel.</p>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-serif mb-4">Order Notes</h2>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full bg-transparent border border-border px-4 py-3" />
            </section>
          </div>

          <div className="border border-border p-6 h-fit sticky top-24">
            <div className="eyebrow mb-4">Order Summary</div>
            <div className="space-y-3 max-h-64 overflow-auto">
              {items.map((it: any) => it.product && (
                <div key={it.id} className="flex gap-3 text-sm">
                  <img src={it.product.images?.[0]} alt="" className="w-12 h-16 object-cover bg-surface" />
                  <div className="flex-1">
                    <div className="font-serif">{it.product.name}</div>
                    <div className="text-xs text-muted-foreground">Qty {it.quantity}</div>
                  </div>
                  <div>{formatMoney(effectivePrice(it.product) * it.quantity)}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-2">
              <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Coupon code" className="flex-1 bg-transparent border border-border px-3 py-2 text-sm" />
              <button type="button" onClick={applyCoupon} className="text-xs uppercase tracking-[0.2em] text-primary border border-primary px-3">Apply</button>
            </div>

            <div className="mt-6 border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shippingCost === 0 ? "Free" : formatMoney(shippingCost)}</span></div>
              {discount > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>−{formatMoney(discount)}</span></div>}
            </div>
            <div className="border-t border-border mt-4 pt-4 flex justify-between text-lg">
              <span>Total</span>
              <span className="text-primary">{formatMoney(total)}</span>
            </div>
            <button disabled={placing || items.length === 0} className="w-full mt-6 border border-primary bg-primary text-primary-foreground py-4 text-xs uppercase tracking-[0.24em] hover:bg-transparent hover:text-primary transition disabled:opacity-50">
              {placing ? "Placing…" : "Place Order"}
            </button>
          </div>
        </form>
      </div>
    </SiteShell>
  );
}
