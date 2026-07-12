
-- Extend coupons
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS per_user_limit INTEGER,
  ADD COLUMN IF NOT EXISTS applies_to TEXT NOT NULL DEFAULT 'all', -- all | categories | products
  ADD COLUMN IF NOT EXISTS category_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS product_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_discount NUMERIC(12,2);

-- Coupon usage log (per user tracking)
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coupon_usages_coupon_idx ON public.coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS coupon_usages_user_idx ON public.coupon_usages(user_id);
GRANT SELECT, INSERT ON public.coupon_usages TO authenticated;
GRANT ALL ON public.coupon_usages TO service_role;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own coupon usage" ON public.coupon_usages FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users insert own coupon usage" ON public.coupon_usages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Flash Sales / Deal of the Day
CREATE TABLE public.flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  banner_image TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percent', -- percent | fixed
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  applies_to TEXT NOT NULL DEFAULT 'products', -- products | categories | all
  product_ids UUID[] DEFAULT '{}',
  category_ids UUID[] DEFAULT '{}',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_deal_of_the_day BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  max_uses_per_product INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX flash_sales_active_idx ON public.flash_sales(is_active, starts_at, ends_at);
GRANT SELECT ON public.flash_sales TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.flash_sales TO authenticated;
GRANT ALL ON public.flash_sales TO service_role;
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active flash sales" ON public.flash_sales FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage flash sales" ON public.flash_sales FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER flash_sales_updated_at BEFORE UPDATE ON public.flash_sales FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Shipping Zones
CREATE TABLE public.shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  countries TEXT[] NOT NULL DEFAULT '{}', -- ISO country codes; ['*'] = rest of world
  regions TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shipping_zones TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shipping_zones TO authenticated;
GRANT ALL ON public.shipping_zones TO service_role;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read shipping zones" ON public.shipping_zones FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage shipping zones" ON public.shipping_zones FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER shipping_zones_updated_at BEFORE UPDATE ON public.shipping_zones FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Shipping Rates within zones
CREATE TABLE public.shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  method_type TEXT NOT NULL DEFAULT 'flat', -- flat | per_weight | price_tier
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  per_kg NUMERIC(12,2),
  min_order_total NUMERIC(12,2),
  max_order_total NUMERIC(12,2),
  free_over NUMERIC(12,2),
  estimated_days TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX shipping_rates_zone_idx ON public.shipping_rates(zone_id);
GRANT SELECT ON public.shipping_rates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shipping_rates TO authenticated;
GRANT ALL ON public.shipping_rates TO service_role;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read shipping rates" ON public.shipping_rates FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage shipping rates" ON public.shipping_rates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Tax Rates
CREATE TABLE public.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rate NUMERIC(6,3) NOT NULL DEFAULT 0, -- percentage
  countries TEXT[] NOT NULL DEFAULT '{}', -- ISO codes; ['*'] = default
  regions TEXT[] DEFAULT '{}',
  category_ids UUID[] DEFAULT '{}', -- empty = all categories
  is_compound BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tax_rates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tax_rates TO authenticated;
GRANT ALL ON public.tax_rates TO service_role;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read tax rates" ON public.tax_rates FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage tax rates" ON public.tax_rates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER tax_rates_updated_at BEFORE UPDATE ON public.tax_rates FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Extend payment_methods with provider adapter field
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual', -- stripe | paypal | cod | bank_transfer | manual
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'test', -- test | live
  ADD COLUMN IF NOT EXISTS supported_currencies TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Seed default payment methods if none exist
INSERT INTO public.payment_methods (code, name, description, provider, is_active, sort_order)
SELECT * FROM (VALUES
  ('cod', 'Cash on Delivery', 'Pay in cash when you receive your order.', 'cod', true, 0),
  ('bank_transfer', 'Bank Transfer', 'Pay via direct bank transfer. Order ships once payment is confirmed.', 'bank_transfer', true, 1)
) AS v(code, name, description, provider, is_active, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.payment_methods);

-- Seed a default worldwide shipping zone if none exist
INSERT INTO public.shipping_zones (name, countries, is_active)
SELECT 'Worldwide', ARRAY['*'], true
WHERE NOT EXISTS (SELECT 1 FROM public.shipping_zones);
