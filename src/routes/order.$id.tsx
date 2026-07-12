import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/site-header";
import { formatMoney } from "@/lib/format";
import { useEffect } from "react";

export const Route = createFileRoute("/order/$id")({
  head: () => ({ meta: [{ title: "Order confirmed | AURELIA" }] }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);
      return { order, items: items ?? [] };
    },
  });

  return (
    <SiteShell>
      <div className="container-luxe py-20 max-w-3xl">
        <div className="eyebrow mb-2 text-primary">Thank you</div>
        <h1 className="text-5xl font-serif mb-3">Order Confirmed</h1>
        <p className="text-muted-foreground">Order #{data?.order?.order_number}</p>

        {data?.order && (
          <div className="mt-10 border border-border p-6">
            <div className="space-y-3 mb-6">
              {data.items.map((it) => (
                <div key={it.id} className="flex gap-3 text-sm">
                  <img src={it.product_image ?? ""} alt="" className="w-14 h-16 object-cover bg-surface" />
                  <div className="flex-1"><div className="font-serif">{it.product_name}</div><div className="text-xs text-muted-foreground">Qty {it.quantity}</div></div>
                  <div>{formatMoney(it.total)}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(data.order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatMoney(data.order.shipping_cost)}</span></div>
              {Number(data.order.discount) > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>−{formatMoney(data.order.discount)}</span></div>}
              <div className="flex justify-between text-lg pt-2 border-t border-border"><span>Total</span><span className="text-primary">{formatMoney(data.order.total)}</span></div>
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-4">
          <Link to="/shop" className="border border-primary bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.24em]">Keep Shopping</Link>
          <Link to="/account" className="border border-border px-6 py-3 text-xs uppercase tracking-[0.24em] hover:border-primary hover:text-primary">View Orders</Link>
        </div>
      </div>
    </SiteShell>
  );
}
