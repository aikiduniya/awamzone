import { Link, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { effectivePrice, formatMoney, discountPct } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  sale_price?: number | string | null;
  images?: string[] | null;
  stock?: number;
};

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const wish = useWishlist();
  const navigate = useNavigate();
  const img = product.images?.[0] ?? "https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=800";
  const price = effectivePrice(product);
  const off = discountPct(product);
  const saved = wish.has(product.id);

  return (
    <div className="group relative">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface">
          <img
            src={img}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          {off > 0 && (
            <div className="absolute left-3 top-3 bg-primary text-primary-foreground text-[10px] uppercase tracking-[0.2em] px-2 py-1">
              −{off}%
            </div>
          )}
          <button
            type="button"
            aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!wish.authenticated) {
                navigate({ to: "/auth" });
                return;
              }
              wish.toggle.mutate(product.id);
            }}
            className={cn(
              "absolute right-3 top-3 h-9 w-9 grid place-items-center rounded-full bg-background/85 backdrop-blur border border-border/60 hover:border-primary transition",
              saved && "text-primary border-primary",
            )}
          >
            <Heart size={16} fill={saved ? "currentColor" : "none"} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              add.mutate({ product_id: product.id });
            }}
            className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all bg-background/90 text-foreground text-[11px] uppercase tracking-[0.24em] py-3 hover:bg-primary hover:text-primary-foreground"
          >
            Add to bag
          </button>
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <div className="font-serif text-lg leading-tight">{product.name}</div>
          <div className="text-sm">
            {product.sale_price && Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price) ? (
              <div className="flex gap-2">
                <span className="text-primary">{formatMoney(price)}</span>
                <span className="text-muted-foreground line-through">{formatMoney(product.price)}</span>
              </div>
            ) : (
              <span className="text-foreground">{formatMoney(price)}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
