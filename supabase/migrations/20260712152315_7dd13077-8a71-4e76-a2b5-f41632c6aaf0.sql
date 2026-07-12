
-- Auto-log order status/payment transitions to order_events
CREATE OR REPLACE FUNCTION public.log_order_event()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_events (order_id, event_type, from_status, to_status, note)
    VALUES (NEW.id, 'order.created', NULL, NEW.status, 'Order created');
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_events (order_id, event_type, from_status, to_status, note)
    VALUES (NEW.id, 'order.status_changed', OLD.status::text, NEW.status::text,
            'Status changed to ' || NEW.status::text);
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.order_events (order_id, event_type, from_status, to_status, note)
    VALUES (NEW.id, 'payment.status_changed', OLD.payment_status::text, NEW.payment_status::text,
            'Payment ' || NEW.payment_status::text);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_orders_event_log ON public.orders;
CREATE TRIGGER trg_orders_event_log
AFTER INSERT OR UPDATE OF status, payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_event();

-- Rate limits (simple leaky-bucket table)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket, key)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Service role bypasses; no user policies needed.

CREATE OR REPLACE FUNCTION public.hit_rate_limit(_bucket TEXT, _key TEXT, _limit INT, _window_seconds INT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row_count INT; row_start TIMESTAMPTZ;
BEGIN
  INSERT INTO public.rate_limits (bucket, key) VALUES (_bucket, _key)
    ON CONFLICT (bucket, key) DO NOTHING;
  SELECT count, window_start INTO row_count, row_start FROM public.rate_limits
    WHERE bucket = _bucket AND key = _key FOR UPDATE;
  IF row_start < now() - make_interval(secs => _window_seconds) THEN
    UPDATE public.rate_limits SET count = 1, window_start = now()
      WHERE bucket = _bucket AND key = _key;
    RETURN TRUE;
  END IF;
  IF row_count >= _limit THEN RETURN FALSE; END IF;
  UPDATE public.rate_limits SET count = count + 1 WHERE bucket = _bucket AND key = _key;
  RETURN TRUE;
END; $$;
REVOKE EXECUTE ON FUNCTION public.hit_rate_limit(TEXT, TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(TEXT, TEXT, INT, INT) TO service_role;

-- Ensure site_settings is readable by everyone (currency, brand info, analytics ids)
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
