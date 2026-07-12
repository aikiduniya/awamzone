
-- Notifications: allow admins/staff to read broadcast and personal notifications
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;

CREATE POLICY "Read own or admin broadcast" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND public.is_admin(auth.uid())));

CREATE POLICY "Update own or admin broadcast" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND public.is_admin(auth.uid())))
  WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND public.is_admin(auth.uid())));

CREATE POLICY "Service role inserts notifications" ON public.notifications
  FOR INSERT TO service_role WITH CHECK (true);

-- Helper: create an admin-broadcast notification
CREATE OR REPLACE FUNCTION public.notify_admins(_title text, _message text, _type text, _link text DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
  VALUES (NULL, _title, _message, _type, _link, false);
$$;

REVOKE EXECUTE ON FUNCTION public.notify_admins(text,text,text,text) FROM anon, authenticated;

-- Triggers for automatic notifications
CREATE OR REPLACE FUNCTION public.tg_notify_new_order() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins(
    'New order ' || COALESCE(NEW.order_number, ''),
    'Order total ' || COALESCE(NEW.total::text,'0') || ' from ' || COALESCE(NEW.email,'guest'),
    'order.new',
    '/admin/orders'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notify_new_order ON public.orders;
CREATE TRIGGER notify_new_order AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_order();

CREATE OR REPLACE FUNCTION public.tg_notify_contact() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins(
    'Contact form submission',
    COALESCE(NEW.name,'Someone') || ' — ' || COALESCE(LEFT(NEW.message, 120),''),
    'contact.new',
    '/admin/contact'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notify_contact ON public.contact_submissions;
CREATE TRIGGER notify_contact AFTER INSERT ON public.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_contact();

CREATE OR REPLACE FUNCTION public.tg_notify_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins('New product review', 'Rating: ' || COALESCE(NEW.rating::text,'-'), 'review.new', '/admin/reviews');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notify_review ON public.reviews;
CREATE TRIGGER notify_review AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_review();

CREATE OR REPLACE FUNCTION public.tg_notify_question() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins('New product question', COALESCE(LEFT(NEW.question,120),''), 'qa.new', '/admin/qa');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notify_question ON public.product_questions;
CREATE TRIGGER notify_question AFTER INSERT ON public.product_questions
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_question();

CREATE OR REPLACE FUNCTION public.tg_notify_newsletter() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins('Newsletter subscription', NEW.email, 'newsletter.new', '/admin/newsletter');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notify_newsletter ON public.newsletter_subscribers;
CREATE TRIGGER notify_newsletter AFTER INSERT ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_newsletter();

CREATE OR REPLACE FUNCTION public.tg_notify_return() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins('Return request', COALESCE(LEFT(NEW.reason,120),''), 'return.new', '/admin/returns');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notify_return ON public.return_requests;
CREATE TRIGGER notify_return AFTER INSERT ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_return();

-- Default site settings (safe if already present)
INSERT INTO public.site_settings (key, value) VALUES
  ('whatsapp', jsonb_build_object(
    'enabled', false, 'phone', '', 'message', 'Hello! I have a question about your products.',
    'position', 'bottom-right', 'business_name', '', 'business_logo', '',
    'greeting', 'Hi there! How can we help you today?', 'online', true,
    'working_hours', '', 'color', ''
  )),
  ('social', jsonb_build_object(
    'instagram', jsonb_build_object('url','','enabled',true,'order',1),
    'facebook',  jsonb_build_object('url','','enabled',true,'order',2),
    'twitter',   jsonb_build_object('url','','enabled',true,'order',3),
    'linkedin',  jsonb_build_object('url','','enabled',false,'order',4),
    'youtube',   jsonb_build_object('url','','enabled',true,'order',5),
    'tiktok',    jsonb_build_object('url','','enabled',false,'order',6),
    'pinterest', jsonb_build_object('url','','enabled',false,'order',7),
    'snapchat',  jsonb_build_object('url','','enabled',false,'order',8),
    'threads',   jsonb_build_object('url','','enabled',false,'order',9),
    'telegram',  jsonb_build_object('url','','enabled',false,'order',10),
    'whatsapp',  jsonb_build_object('url','','enabled',false,'order',11),
    'discord',   jsonb_build_object('url','','enabled',false,'order',12),
    'reddit',    jsonb_build_object('url','','enabled',false,'order',13)
  )),
  ('notifications_settings', jsonb_build_object(
    'sound_enabled', true, 'sound_url', '',
    'types', jsonb_build_object(
      'order.new', true, 'contact.new', true, 'review.new', true,
      'qa.new', true, 'newsletter.new', true, 'return.new', true,
      'stock.low', true, 'stock.out', true, 'payment.failed', true
    )
  ))
ON CONFLICT (key) DO NOTHING;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
