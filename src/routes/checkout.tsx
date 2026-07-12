import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/site/site-header";
import { useCart } from "@/hooks/use-cart";
import { useSession } from "@/hooks/use-session";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import {
  effectivePrice as engineEffectivePrice, findZoneForCountry,
  calculateShipping, rateApplies, calculateTax, validateCoupon,
  type FlashSale, type TaxRate, type ShippingZone, type ShippingRate,
} from "@/lib/pricing";
import { getPaymentAdapter } from "@/lib/payments";
import { placeOrder as placeOrderFn } from "@/lib/checkout.functions";
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
    full_name: "", phone: "", line1: "", line2: "",
    city: "", state: "", postal_code: "", country: "US", notes: "",
  });

  const [rateId, setRateId] = useState<string>("");
  const [paymentId, setPaymentId] = useState<string>("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<any>(null);

  const { data: zones } = useQuery({
    queryKey: ["site-zones"],
    queryFn: async () => ((await supabase.from("shipping_zones").select("*").eq("is_active", true)).data ?? []) as ShippingZone[],
  });
  const { data: rates } = useQuery({
    queryKey: ["site-rates"],
    queryFn: async () => ((await supabase.from("shipping_rates").select("*").eq("is_active", true).order("sort_order")).data ?? []) as ShippingRate[],
  });
  const { data: payments } = useQuery({
    queryKey: ["site-payments"],
    queryFn: async () => (await supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });
  const { data: flashSales } = useQuery({
    queryKey: ["site-flash-active"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase.from("flash_sales").select("*").eq("is_active", true).lte("starts_at", now).gte("ends_at", now);
      return (data ?? []) as FlashSale[];
    },
  });
  const { data: taxRates } = useQuery({
    queryKey: ["site-taxes"],
    queryFn: async () => ((await supabase.from("tax_rates").select("*").eq("is_active", true)).data ?? []) as TaxRate[],
  });

  const zone = useMemo(() => zones ? findZoneForCountry(zones, form.country) : null, [zones, form.country]);
  const totalWeight = useMemo(() => items.reduce((s, it: any) => s + Number(it.product?.weight ?? 0) * it.quantity, 0), [items]);

  const zoneRates = useMemo(() => (rates ?? []).filter((r) => r.zone_id === zone?.id && rateApplies(r, subtotal)), [rates, zone, subtotal]);
  const selectedRate = zoneRates.find((r) => r.id === rateId) ?? zoneRates[0];
  const shippingCost = useMemo(() => selectedRate ? calculateShipping(selectedRate, subtotal, totalWeight) : 0, [selectedRate, subtotal, totalWeight]);

  const engineItems = useMemo(() => items.filter((it: any) => it.product).map((it: any) => ({
    product_id: it.product.id, variant_id: it.variant_id ?? null, quantity: it.quantity, product: it.product,
  })), [items]);

  const engineSubtotal = useMemo(() => engineItems.reduce((s, it) => s + engineEffectivePrice(it.product, flashSales ?? []) * it.quantity, 0), [engineItems, flashSales]);
  const tax = useMemo(() => calculateTax(engineItems, flashSales ?? [], taxRates ?? [], form.country), [engineItems, flashSales, taxRates, form.country]);
  const discount = coupon?.discount ?? 0;
  const finalShipping = coupon?.freeShipping ? 0 : shippingCost;
  const total = Math.max(0, engineSubtotal + finalShipping + tax - discount);

  const applyCoupon = async () => {
    if (!couponCode) return;
    const res = await validateCoupon(supabase as any, couponCode, engineItems, flashSales ?? [], user?.id ?? null, shippingCost);
    if (!res.ok) return toast.error(res.reason);
    setCoupon(res);
    toast.success("Coupon applied");
  };

  const method = payments?.find((p: any) => p.id === paymentId);

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!method) return toast.error("Choose a payment method");
    if (!selectedRate) return toast.error("No shipping option for your country yet.");
    setPlacing(true);
    try {
      const orderPayload: any = {
        user_id: user?.id ?? null,
        email: form.email,
        subtotal: engineSubtotal,
        discount,
        shipping_cost: finalShipping,
        tax,
        total,
        payment_method: method.code,
        payment_status: "pending",
        status: "pending",
        currency: "USD",
        coupon_code: coupon?.coupon.code ?? null,
        shipping_address: {
          full_name: form.full_name, phone: form.phone, line1: form.line1, line2: form.line2,
          city: form.city, state: form.state, postal_code: form.postal_code, country: form.country,
        },
        notes: form.notes,
        timeline: [{ status: "pending", at: new Date().toISOString(), note: "Order placed" }],
      };
      const { data: order, error } = await supabase.from("orders").insert(orderPayload).select().single();
      if (error) throw error;

      const orderItems = engineItems.map((it) => {
        const price = engineEffectivePrice(it.product, flashSales ?? []);
        return {
          order_id: order.id, product_id: it.product.id,
          product_name: (it as any).product.name ?? "",
          product_image: (it as any).product.images?.[0] ?? null,
          quantity: it.quantity, unit_price: price, total: price * it.quantity,
          variant_id: it.variant_id ?? null,
        };
      });
      await supabase.from("order_items").insert(orderItems);

      // Log coupon usage
      if (coupon?.coupon) {
        await supabase.from("coupon_usages").insert({
          coupon_id: coupon.coupon.id, user_id: user?.id ?? null,
          order_id: order.id, discount_amount: discount,
        });
        await supabase.from("coupons").update({ used_count: (coupon.coupon.used_count ?? 0) + 1 }).eq("id", coupon.coupon.id);
      }

      // Route payment via adapter
      const adapter = getPaymentAdapter(method.provider);
      const result = await adapter.initiate({
        supabase: supabase as any,
        orderId: order.id, orderNumber: order.order_number, amount: total, currency: "USD",
        customerEmail: form.email,
        returnUrl: `${window.location.origin}/order/${order.id}`,
        cancelUrl: `${window.location.origin}/checkout`,
        method: {
          id: method.id, code: method.code, provider: method.provider,
          config: (method.config as any) ?? {}, environment: method.environment, instructions: method.instructions,
        },
      });

      if (result.kind === "failed") {
        toast.error(result.error);
      } else if (result.kind === "redirect") {
        window.location.href = result.url;
        return;
      } else {
        if (result.reference) {
          await supabase.from("orders").update({ payment_reference: result.reference }).eq("id", order.id);
        }
        if (result.kind === "completed") {
          await supabase.from("orders").update({ payment_status: "paid" }).eq("id", order.id);
        }
        if (result.kind === "pending" && result.message) toast.success(result.message);
      }

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
                <input placeholder="State/Region" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="bg-transparent border border-border px-4 py-3" />
                <input placeholder="Postal code" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="bg-transparent border border-border px-4 py-3" />
                <input required placeholder="Country (ISO code, e.g. US)" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} className="bg-transparent border border-border px-4 py-3" />
              </div>
              {!zone && form.country && <p className="text-xs text-destructive mt-2">No shipping zone covers this country yet.</p>}
            </section>

            <section>
              <h2 className="text-2xl font-serif mb-4">Shipping Method</h2>
              {zoneRates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No shipping rates available for your address.</p>
              ) : (
                <div className="space-y-2">
                  {zoneRates.map((s) => (
                    <label key={s.id} className={`flex items-center justify-between border p-4 cursor-pointer ${(rateId || zoneRates[0]?.id) === s.id ? "border-primary" : "border-border"}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="shipping" checked={(rateId || zoneRates[0]?.id) === s.id} onChange={() => setRateId(s.id)} className="accent-primary" />
                        <div>
                          <div>{s.name}{s.estimated_days && <span className="text-xs text-muted-foreground ml-2">({s.estimated_days} days)</span>}</div>
                          {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
                        </div>
                      </div>
                      <div>{calculateShipping(s, subtotal, totalWeight) === 0 ? "Free" : formatMoney(calculateShipping(s, subtotal, totalWeight))}</div>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-serif mb-4">Payment</h2>
              <div className="space-y-2">
                {payments?.map((p: any) => (
                  <label key={p.id} className={`block border p-4 cursor-pointer ${paymentId === p.id ? "border-primary" : "border-border"}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment" checked={paymentId === p.id} onChange={() => setPaymentId(p.id)} className="accent-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {p.icon_url && <img src={p.icon_url} alt="" className="h-5" />}
                          <span>{p.name}</span>
                          {p.environment === "test" && <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">TEST</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                        {paymentId === p.id && p.instructions && (
                          <div className="mt-2 text-xs text-muted-foreground bg-surface p-3 whitespace-pre-line">{p.instructions}</div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
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
                  <div>{formatMoney(engineEffectivePrice(it.product, flashSales ?? []) * it.quantity)}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-2">
              <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Coupon code" className="flex-1 bg-transparent border border-border px-3 py-2 text-sm" />
              <button type="button" onClick={applyCoupon} className="text-xs uppercase tracking-[0.2em] text-primary border border-primary px-3">Apply</button>
            </div>

            <div className="mt-6 border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(engineSubtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{finalShipping === 0 ? "Free" : formatMoney(finalShipping)}</span></div>
              {tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(tax)}</span></div>}
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
