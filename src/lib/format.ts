// Money & price helpers. Prefer `useFormatMoney()` from '@/lib/site-settings'
// which reads currency from the admin panel. This synchronous helper accepts
// a currency symbol override (defaults to '$') for places without React context.
export function formatMoney(amount: number | string | null | undefined, currencySymbol = "$") {
  const n = Number(amount ?? 0);
  return `${currencySymbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function effectivePrice(p: { price: number | string; sale_price?: number | string | null }) {
  const sale = p.sale_price != null ? Number(p.sale_price) : null;
  const price = Number(p.price);
  return sale && sale > 0 && sale < price ? sale : price;
}

export function discountPct(p: { price: number | string; sale_price?: number | string | null }) {
  const sale = p.sale_price != null ? Number(p.sale_price) : null;
  const price = Number(p.price);
  if (!sale || sale <= 0 || sale >= price) return 0;
  return Math.round(((price - sale) / price) * 100);
}
