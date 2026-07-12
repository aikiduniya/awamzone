
CREATE OR REPLACE FUNCTION public.decrement_stock(_items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it jsonb; pid uuid; vid uuid; qty int; current_stock int;
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    pid := (it->>'product_id')::uuid;
    vid := NULLIF(it->>'variant_id','')::uuid;
    qty := (it->>'quantity')::int;
    IF vid IS NOT NULL THEN
      SELECT stock INTO current_stock FROM public.product_variants WHERE id = vid FOR UPDATE;
      IF current_stock IS NULL THEN RAISE EXCEPTION 'Variant % not found', vid; END IF;
      IF current_stock < qty THEN RAISE EXCEPTION 'Insufficient stock for variant %', vid; END IF;
      UPDATE public.product_variants SET stock = stock - qty WHERE id = vid;
    ELSE
      SELECT stock INTO current_stock FROM public.products WHERE id = pid FOR UPDATE;
      IF current_stock IS NULL THEN RAISE EXCEPTION 'Product % not found', pid; END IF;
      IF current_stock < qty THEN RAISE EXCEPTION 'Insufficient stock for product %', pid; END IF;
      UPDATE public.products SET stock = stock - qty WHERE id = pid;
    END IF;
  END LOOP;
END; $$;
GRANT EXECUTE ON FUNCTION public.decrement_stock(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.restock_items(_items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it jsonb; pid uuid; vid uuid; qty int;
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    pid := (it->>'product_id')::uuid;
    vid := NULLIF(it->>'variant_id','')::uuid;
    qty := (it->>'quantity')::int;
    IF vid IS NOT NULL THEN UPDATE public.product_variants SET stock = stock + qty WHERE id = vid;
    ELSE UPDATE public.products SET stock = stock + qty WHERE id = pid; END IF;
  END LOOP;
END; $$;
GRANT EXECUTE ON FUNCTION public.restock_items(jsonb) TO service_role;

CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON public.reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_user ON public.coupon_usages(coupon_id, user_id);
CREATE INDEX IF NOT EXISTS idx_flash_sales_active_window ON public.flash_sales(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
