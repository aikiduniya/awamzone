import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/site-header";
import { useCart } from "@/hooks/use-cart";
import { effectivePrice, formatMoney } from "@/lib/format";
import { Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your Bag | AURELIA" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, updateQty, remove, loading } = useCart();

  return (
    <SiteShell>
      <div className="container-luxe py-16">
        <div className="eyebrow mb-2">Your Selection</div>
        <h1 className="text-5xl font-serif mb-10">Shopping Bag</h1>

        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground mb-6">Your bag is empty.</p>
            <Link to="/shop" className="inline-block border border-primary bg-primary text-primary-foreground px-8 py-3 text-xs uppercase tracking-[0.24em] hover:bg-transparent hover:text-primary transition">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6">
              {items.map((it: any) => {
                if (!it.product) return null;
                const price = effectivePrice(it.product);
                const stock = Number(it.product.stock ?? 0);
                const atMax = it.quantity >= stock;
                return (
                  <div key={it.id} className="flex gap-6 border-b border-border pb-6">
                    <Link to="/product/$slug" params={{ slug: it.product.slug }} className="w-28 h-36 shrink-0 overflow-hidden bg-surface">
                      <img src={it.product.images?.[0]} alt={it.product.name} className="h-full w-full object-cover" />
                    </Link>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <Link to="/product/$slug" params={{ slug: it.product.slug }} className="font-serif text-xl hover:text-primary">{it.product.name}</Link>
                        <div className="text-primary mt-1">{formatMoney(price)}</div>
                        {atMax && <div className="text-[11px] text-destructive mt-1">Maximum available stock reached ({stock})</div>}
                        {!atMax && stock > 0 && stock <= 5 && <div className="text-[11px] text-muted-foreground mt-1">Only {stock - it.quantity} left</div>}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-border">
                          <button onClick={() => updateQty.mutate({ id: it.id, quantity: it.quantity - 1 })} className="px-3 py-2 hover:text-primary" aria-label="Decrease"><Minus size={12} /></button>
                          <span className="px-4 text-sm">{it.quantity}</span>
                          <button
                            disabled={atMax}
                            onClick={() => {
                              if (atMax) return toast.error(`Only ${stock} in stock`);
                              updateQty.mutate({ id: it.id, quantity: it.quantity + 1 });
                            }}
                            className="px-3 py-2 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Increase"
                          ><Plus size={12} /></button>
                        </div>
                        <button onClick={() => remove.mutate(it.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>

            <div className="border border-border p-6 h-fit sticky top-24">
              <div className="eyebrow mb-4">Order Summary</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="text-muted-foreground">at checkout</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="text-muted-foreground">at checkout</span></div>
              </div>
              <div className="border-t border-border mt-4 pt-4 flex justify-between text-lg">
                <span>Total</span>
                <span className="text-primary">{formatMoney(subtotal)}</span>
              </div>
              <Link to="/checkout" className="block text-center mt-6 border border-primary bg-primary text-primary-foreground py-4 text-xs uppercase tracking-[0.24em] hover:bg-transparent hover:text-primary transition">
                Checkout
              </Link>
              <Link to="/shop" className="block text-center mt-2 text-xs uppercase tracking-[0.24em] text-muted-foreground hover:text-primary py-2">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
