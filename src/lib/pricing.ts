// Central pricing engine — pure functions, safe on client & server.
// Handles: flash-sale price overrides, coupon validation & discounts, shipping zone lookup, tax calculation.

import type { SupabaseClient } from "@supabase/supabase-js";

export type CartItem = {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  product: {
    id: string;
    price: number;
    sale_price: number | null;
    sale_starts_at?: string | null;
    sale_ends_at?: string | null;
    category_id?: string | null;
    weight?: number | null;
    tax_rate?: number | null;
  };
};

export type FlashSale = {
  id: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  applies_to: "products" | "categories" | "all";
  product_ids: string[];
  category_ids: string[];
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  priority: number;
};

export function flashSaleApplies(sale: FlashSale, product: CartItem["product"], now = new Date()) {
  if (!sale.is_active) return false;
  if (new Date(sale.starts_at) > now || new Date(sale.ends_at) < now) return false;
  if (sale.applies_to === "all") return true;
  if (sale.applies_to === "products") return sale.product_ids.includes(product.id);
  if (sale.applies_to === "categories") return !!product.category_id && sale.category_ids.includes(product.category_id);
  return false;
}

export function applyFlashSalePrice(basePrice: number, sale: FlashSale): number {
  if (sale.discount_type === "percent") return Math.max(0, basePrice * (1 - Number(sale.discount_value) / 100));
  return Math.max(0, basePrice - Number(sale.discount_value));
}

export function baseProductPrice(p: CartItem["product"], now = new Date()): number {
  const salePriceActive =
    p.sale_price != null &&
    (!p.sale_starts_at || new Date(p.sale_starts_at) <= now) &&
    (!p.sale_ends_at || new Date(p.sale_ends_at) >= now);
  return Number(salePriceActive ? p.sale_price : p.price);
}

/** Best (lowest) price after any active flash sale. */
export function effectivePrice(p: CartItem["product"], flashSales: FlashSale[] = [], now = new Date()): number {
  let price = baseProductPrice(p, now);
  const applicable = flashSales.filter((s) => flashSaleApplies(s, p, now)).sort((a, b) => b.priority - a.priority);
  for (const sale of applicable) {
    const candidate = applyFlashSalePrice(baseProductPrice(p, now), sale);
    if (candidate < price) price = candidate;
  }
  return Math.round(price * 100) / 100;
}

export type Coupon = {
  id: string;
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  min_purchase: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number | null;
  applies_to: string;
  category_ids: string[];
  product_ids: string[];
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

export type CouponValidation = { ok: true; discount: number; freeShipping: boolean; coupon: Coupon } | { ok: false; reason: string };

export function couponEligibleAmount(coupon: Coupon, items: CartItem[], flashSales: FlashSale[]): number {
  if (coupon.applies_to === "all") {
    return items.reduce((s, it) => s + effectivePrice(it.product, flashSales) * it.quantity, 0);
  }
  if (coupon.applies_to === "categories") {
    return items
      .filter((it) => it.product.category_id && coupon.category_ids.includes(it.product.category_id))
      .reduce((s, it) => s + effectivePrice(it.product, flashSales) * it.quantity, 0);
  }
  if (coupon.applies_to === "products") {
    return items
      .filter((it) => coupon.product_ids.includes(it.product.id))
      .reduce((s, it) => s + effectivePrice(it.product, flashSales) * it.quantity, 0);
  }
  return 0;
}

export async function validateCoupon(
  supabase: SupabaseClient,
  code: string,
  items: CartItem[],
  flashSales: FlashSale[],
  userId: string | null,
  shippingCost: number,
): Promise<CouponValidation> {
  const { data: coupon } = await supabase.from("coupons").select("*").ilike("code", code).eq("is_active", true).maybeSingle();
  if (!coupon) return { ok: false, reason: "Coupon not found" };

  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return { ok: false, reason: "Coupon not yet active" };
  if (coupon.ends_at && new Date(coupon.ends_at) < now) return { ok: false, reason: "Coupon expired" };
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return { ok: false, reason: "Coupon usage limit reached" };

  const eligible = couponEligibleAmount(coupon as any, items, flashSales);
  if (coupon.min_purchase && eligible < Number(coupon.min_purchase))
    return { ok: false, reason: `Minimum eligible purchase is ${coupon.min_purchase}` };
  if (eligible <= 0 && coupon.type !== "free_shipping") return { ok: false, reason: "Cart has no eligible items" };

  if (userId && coupon.per_user_limit) {
    const { count } = await supabase
      .from("coupon_usages")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("user_id", userId);
    if ((count ?? 0) >= coupon.per_user_limit) return { ok: false, reason: "Per-user usage limit reached" };
  }

  let discount = 0;
  let freeShipping = false;
  if (coupon.type === "percent") discount = (eligible * Number(coupon.value)) / 100;
  else if (coupon.type === "fixed") discount = Math.min(Number(coupon.value), eligible);
  else if (coupon.type === "free_shipping") {
    freeShipping = true;
    discount = shippingCost;
  }
  if (coupon.max_discount) discount = Math.min(discount, Number(coupon.max_discount));
  discount = Math.round(discount * 100) / 100;

  return { ok: true, discount, freeShipping, coupon: coupon as any };
}

// Shipping ---------------------------------------------------------------

export type ShippingZone = { id: string; name: string; countries: string[]; regions: string[] | null; is_active: boolean; sort_order: number };
export type ShippingRate = {
  id: string;
  zone_id: string;
  name: string;
  description: string | null;
  method_type: "flat" | "per_weight" | "price_tier";
  cost: number;
  per_kg: number | null;
  min_order_total: number | null;
  max_order_total: number | null;
  free_over: number | null;
  estimated_days: string | null;
  is_active: boolean;
  sort_order: number;
};

export function findZoneForCountry(zones: ShippingZone[], countryCode: string): ShippingZone | null {
  const cc = countryCode.toUpperCase().trim();
  const specific = zones.find((z) => z.countries.map((c) => c.toUpperCase()).includes(cc));
  if (specific) return specific;
  return zones.find((z) => z.countries.includes("*")) ?? null;
}

export function calculateShipping(rate: ShippingRate, subtotal: number, totalWeightKg: number): number {
  if (rate.free_over != null && subtotal >= Number(rate.free_over)) return 0;
  if (rate.method_type === "flat") return Number(rate.cost);
  if (rate.method_type === "per_weight") return Number(rate.cost) + Number(rate.per_kg ?? 0) * totalWeightKg;
  if (rate.method_type === "price_tier") return Number(rate.cost);
  return Number(rate.cost);
}

export function rateApplies(rate: ShippingRate, subtotal: number): boolean {
  if (!rate.is_active) return false;
  if (rate.min_order_total != null && subtotal < Number(rate.min_order_total)) return false;
  if (rate.max_order_total != null && subtotal > Number(rate.max_order_total)) return false;
  return true;
}

// Tax --------------------------------------------------------------------

export type TaxRate = {
  id: string;
  name: string;
  rate: number;
  countries: string[];
  regions: string[] | null;
  category_ids: string[] | null;
  is_compound: boolean;
  is_active: boolean;
  priority: number;
};

export function calculateTax(items: CartItem[], flashSales: FlashSale[], taxRates: TaxRate[], countryCode: string): number {
  const cc = countryCode.toUpperCase().trim();
  const applicable = taxRates
    .filter((t) => t.is_active)
    .filter((t) => t.countries.includes("*") || t.countries.map((c) => c.toUpperCase()).includes(cc))
    .sort((a, b) => a.priority - b.priority);

  let tax = 0;
  for (const it of items) {
    const line = effectivePrice(it.product, flashSales) * it.quantity;
    for (const t of applicable) {
      const scoped = !t.category_ids || t.category_ids.length === 0
        ? true
        : !!it.product.category_id && t.category_ids.includes(it.product.category_id);
      if (!scoped) continue;
      tax += (line * Number(t.rate)) / 100;
    }
  }
  return Math.round(tax * 100) / 100;
}
