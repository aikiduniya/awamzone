
DROP TRIGGER IF EXISTS trg_orders_event_log ON public.orders;
CREATE OR REPLACE FUNCTION public.log_order_event()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_events (order_id, event_type, message, metadata)
    VALUES (NEW.id, 'order.created', 'Order created',
            jsonb_build_object('status', NEW.status, 'payment_status', NEW.payment_status));
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_events (order_id, event_type, message, metadata)
    VALUES (NEW.id, 'order.status_changed', 'Status: ' || OLD.status::text || ' → ' || NEW.status::text,
            jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.order_events (order_id, event_type, message, metadata)
    VALUES (NEW.id, 'payment.status_changed', 'Payment: ' || OLD.payment_status::text || ' → ' || NEW.payment_status::text,
            jsonb_build_object('from', OLD.payment_status, 'to', NEW.payment_status));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_orders_event_log
AFTER INSERT OR UPDATE OF status, payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_event();
