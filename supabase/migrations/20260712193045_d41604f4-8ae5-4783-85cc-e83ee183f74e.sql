
-- =========================================================================
-- DEMO DATA + THEME/SMTP SETTINGS (retry, schema-corrected)
-- =========================================================================

INSERT INTO public.site_settings (key, value) VALUES
('theme_mode', jsonb_build_object('default','dark','allow_toggle',true,'allow_system',true)),
('theme_light', jsonb_build_object(
  'background','oklch(0.99 0.005 85)','foreground','oklch(0.15 0.005 60)',
  'surface','oklch(0.97 0.006 85)','card','oklch(1 0 0)','popover','oklch(1 0 0)',
  'primary','oklch(0.55 0.14 45)','primary_foreground','oklch(0.99 0.01 85)',
  'secondary','oklch(0.94 0.008 85)','secondary_foreground','oklch(0.15 0.005 60)',
  'muted','oklch(0.94 0.008 85)','muted_foreground','oklch(0.45 0.015 60)',
  'accent','oklch(0.78 0.13 85)','accent_foreground','oklch(0.12 0.005 60)',
  'destructive','oklch(0.62 0.22 27)','destructive_foreground','oklch(0.98 0.01 85)',
  'border','oklch(0.88 0.008 60)','input','oklch(0.92 0.008 60)','ring','oklch(0.55 0.14 45)',
  'gold','oklch(0.62 0.13 85)','gold_foreground','oklch(0.99 0.01 85)')),
('theme_dark', jsonb_build_object(
  'background','oklch(0.13 0.005 60)','foreground','oklch(0.94 0.01 85)',
  'surface','oklch(0.17 0.006 60)','card','oklch(0.17 0.006 60)','popover','oklch(0.15 0.005 60)',
  'primary','oklch(0.78 0.13 85)','primary_foreground','oklch(0.12 0.005 60)',
  'secondary','oklch(0.22 0.008 60)','secondary_foreground','oklch(0.94 0.01 85)',
  'muted','oklch(0.22 0.008 60)','muted_foreground','oklch(0.68 0.015 85)',
  'accent','oklch(0.78 0.13 85)','accent_foreground','oklch(0.12 0.005 60)',
  'destructive','oklch(0.62 0.22 27)','destructive_foreground','oklch(0.98 0.01 85)',
  'border','oklch(0.28 0.008 60)','input','oklch(0.22 0.008 60)','ring','oklch(0.78 0.13 85)',
  'gold','oklch(0.78 0.13 85)','gold_foreground','oklch(0.12 0.005 60)')),
('smtp', jsonb_build_object(
  'host','','port',587,'encryption','tls','username','','password','',
  'from_name','AURELIA','from_email','','reply_to','','enabled',false,
  'note','Lovable managed email is used by default; SMTP config here is stored for future custom relays.'))
ON CONFLICT (key) DO NOTHING;

-- Testimonials table
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, role text, quote text NOT NULL, avatar_url text,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT INSERT,UPDATE,DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read testimonials" ON public.testimonials;
CREATE POLICY "public read testimonials" ON public.testimonials FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "admins manage testimonials" ON public.testimonials;
CREATE POLICY "admins manage testimonials" ON public.testimonials FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.testimonials (name, role, quote, rating, sort_order) VALUES
('Elena Marchetti','Interior Designer, Milan','The craftsmanship is unmatched — every piece feels like a considered heirloom.',5,1),
('James Whitmore','Editor, London','AURELIA has become my quiet ritual. Discreet luxury, delivered flawlessly.',5,2),
('Aiko Tanaka','Curator, Tokyo','A refined edit. The service and packaging elevate the experience entirely.',5,3),
('Sophia Alvarez','Founder, Madrid','Timeless, tactile, and thoughtful. Exactly what modern luxury should feel like.',5,4)
ON CONFLICT DO NOTHING;

-- Blog
INSERT INTO public.blog_categories (name, slug, description) VALUES
('Journal','journal','Field notes from the atelier.'),
('Style','style','Wardrobe and object stories.'),
('Rituals','rituals','Fragrance, home and slow living.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.blog_posts (title, slug, excerpt, content, is_published, published_at, tags, meta_title, meta_description) VALUES
('The Quiet Return of Craft','the-quiet-return-of-craft','How a new generation of makers is rewriting luxury on their own terms.','<p>Craft is not a trend — it is a stance. In studios from Kyoto to Como, a slower cadence has re-emerged: fewer pieces, longer horizons, closer relationships.</p><p>This edition of the journal visits three ateliers shaping our next drop.</p>',true, now() - interval '10 days', ARRAY['craft','journal'],'The Quiet Return of Craft — AURELIA Journal','Notes on craft, patience, and the makers behind our latest edit.'),
('Building a Considered Wardrobe','building-a-considered-wardrobe','Ten pieces, worn a hundred ways — a working philosophy.','<p>A considered wardrobe is not about restraint — it is about clarity. Below, our editors share the ten pieces they return to season after season.</p>',true, now() - interval '4 days', ARRAY['style','wardrobe'],'A Considered Wardrobe — AURELIA','Ten essential pieces for a modern, considered wardrobe.'),
('An Evening Ritual','an-evening-ritual','Fragrance, low light, and the art of the wind-down.','<p>The evening ritual is a small architecture — a fragrance, a warm surface, an unhurried gesture. Here is ours.</p>',true, now() - interval '1 days', ARRAY['fragrance','ritual'],'An Evening Ritual — AURELIA','Fragrance, low light, and the small architecture of an evening ritual.')
ON CONFLICT (slug) DO NOTHING;

-- FAQs
INSERT INTO public.faqs (question, answer, category, sort_order, is_published) VALUES
('How long does shipping take?','Standard worldwide shipping takes 3–7 business days. Express is 1–3 business days to most destinations.','Shipping',1,true),
('What is your return policy?','We accept returns within 30 days of delivery for unworn items in original packaging.','Returns',2,true),
('Do you offer gift wrapping?','Yes — every order can be gift wrapped at checkout. Add a handwritten note free of charge.','Orders',3,true),
('How do I track my order?','You will receive a tracking link by email once your order ships. You can also view it in your account.','Orders',4,true),
('Are your products authentic?','Every item is sourced directly from the maker or authorised atelier.','Products',5,true),
('What payment methods do you accept?','Major cards, Apple Pay, Google Pay, and select regional wallets.','Payments',6,true),
('How do I contact customer care?','Write to care@aurelia.example — we reply within one business day, seven days a week.','Support',7,true)
ON CONFLICT DO NOTHING;

-- Coupons
INSERT INTO public.coupons (code, name, description, type, value, min_purchase, usage_limit, per_user_limit, starts_at, ends_at, is_active, applies_to) VALUES
('WELCOME10','Welcome 10','10% off your first order','percent',10,50,1000,1, now() - interval '10 days', now() + interval '90 days', true, 'all'),
('SUMMER25','Summer Edit','25% off summer selection','percent',25,150,500,2, now() - interval '5 days', now() + interval '30 days', true, 'all'),
('FREESHIP','Free Shipping','Free shipping over $100','free_shipping',0,100,NULL,NULL, now() - interval '30 days', now() + interval '365 days', true, 'all'),
('VIP50','VIP $50 off','$50 off orders over $500','fixed',50,500,200,1, now(), now() + interval '60 days', true, 'all')
ON CONFLICT (code) DO NOTHING;

-- Flash sales
INSERT INTO public.flash_sales (name, slug, description, discount_type, discount_value, applies_to, product_ids, starts_at, ends_at, is_deal_of_the_day, is_active, priority)
SELECT 'Deal of the Day — Amber Noir','deal-amber-noir','Limited 24-hour offer on our signature fragrance.','percent',20,'products',
       ARRAY(SELECT id FROM public.products WHERE slug='amber-noir-edp'), now(), now() + interval '1 day', true, true, 10
WHERE NOT EXISTS (SELECT 1 FROM public.flash_sales WHERE slug='deal-amber-noir');

INSERT INTO public.flash_sales (name, slug, description, discount_type, discount_value, applies_to, category_ids, starts_at, ends_at, is_deal_of_the_day, is_active, priority)
SELECT 'Fashion Flash','fashion-flash','15% off Fashion for a limited time.','percent',15,'categories',
       ARRAY(SELECT id FROM public.categories WHERE slug='fashion'), now(), now() + interval '7 days', false, true, 5
WHERE NOT EXISTS (SELECT 1 FROM public.flash_sales WHERE slug='fashion-flash');

-- Suppliers & Warehouses
INSERT INTO public.suppliers (name, email, phone, address, notes, is_active) VALUES
('Como Silks Atelier','orders@comosilks.example','+39 031 555 0123','Via Milano 12, 22100 Como, Italy','Primary silk & outerwear atelier',true),
('Kyoto Ceramics Guild','hello@kyoto-ceramics.example','+81 75 555 8899','Higashiyama, Kyoto, Japan','Ceramics and tableware',true),
('Nord Foundry','sales@nordfoundry.example','+45 33 55 22 11','Copenhagen, Denmark','Lighting and small furniture',true),
('Provence Perfumers','contact@provence-perfume.example','+33 4 90 55 66 77','Grasse, France','Fragrance house',true)
ON CONFLICT DO NOTHING;

INSERT INTO public.warehouses (name, address, is_default, is_active) VALUES
('Main — Amsterdam','Havenstraat 24, 1075 PR Amsterdam, NL',true,true),
('US — New Jersey','120 Riverside Dr, Newark NJ 07101, USA',false,true),
('APAC — Singapore','8 Marina Blvd, Singapore 018981',false,true)
ON CONFLICT DO NOTHING;

-- Customer groups
INSERT INTO public.customer_groups (name, discount_percent, notes) VALUES
('Retail',0,'Default group'),('VIP',10,'Top spenders — automatic 10% discount'),
('Wholesale',20,'B2B pricing'),('Press',15,'Editors and industry')
ON CONFLICT DO NOTHING;

-- Shipping rates
INSERT INTO public.shipping_rates (zone_id, name, description, method_type, cost, free_over, estimated_days, is_active, sort_order)
SELECT z.id,'Standard','Tracked delivery worldwide','flat',15,150,'3–7 business days',true,1 FROM public.shipping_zones z WHERE z.countries @> ARRAY['*']
  AND NOT EXISTS (SELECT 1 FROM public.shipping_rates r WHERE r.zone_id=z.id AND r.name='Standard');
INSERT INTO public.shipping_rates (zone_id, name, description, method_type, cost, free_over, estimated_days, is_active, sort_order)
SELECT z.id,'Express','Priority courier','flat',35,500,'1–3 business days',true,2 FROM public.shipping_zones z WHERE z.countries @> ARRAY['*']
  AND NOT EXISTS (SELECT 1 FROM public.shipping_rates r WHERE r.zone_id=z.id AND r.name='Express');

-- Tax rates
INSERT INTO public.tax_rates (name, rate, countries, is_active, priority) VALUES
('EU VAT (Standard)',21.0,ARRAY['DE','FR','NL','IT','ES','BE','AT','IE','PT'],true,10),
('UK VAT',20.0,ARRAY['GB'],true,10),
('US Sales Tax (default)',7.5,ARRAY['US'],true,10)
ON CONFLICT DO NOTHING;

-- Email templates
INSERT INTO public.email_templates (code, subject, body, is_active) VALUES
('order_confirmation','Your AURELIA order {{order_number}} is confirmed','<h1>Thank you, {{customer_name}}</h1><p>We''ve received order <strong>{{order_number}}</strong> for <strong>{{order_total}}</strong>.</p>',true),
('order_shipped','Your order {{order_number}} is on the way','<h1>On its way</h1><p>Order {{order_number}} shipped with {{carrier}}. Tracking: {{tracking_number}}</p>',true),
('order_delivered','Your order {{order_number}} has been delivered','<h1>Delivered</h1><p>Order {{order_number}} was delivered. We hope it feels right.</p>',true),
('order_cancelled','Your order {{order_number}} was cancelled','<p>Order {{order_number}} has been cancelled. Any charge will be refunded within 5–7 business days.</p>',true),
('refund_processed','Refund processed for order {{order_number}}','<p>Your refund of {{refund_amount}} for order {{order_number}} has been issued.</p>',true),
('return_approved','Your return has been approved','<p>Return for order {{order_number}} has been approved. Instructions inside.</p>',true),
('return_rejected','Your return was not approved','<p>We could not approve the return for order {{order_number}}. Reason: {{reason}}</p>',true),
('password_reset','Reset your AURELIA password','<p>Use this link to reset your password: {{reset_link}}</p>',true),
('welcome','Welcome to AURELIA','<h1>Welcome, {{customer_name}}</h1><p>Enjoy 10% off your first order with code <strong>WELCOME10</strong>.</p>',true),
('newsletter_confirm','Confirm your subscription','<p>Please confirm your subscription: {{confirm_link}}</p>',true),
('contact_received','We received your message','<p>Thank you {{name}} — we will reply within one business day.</p>',true),
('low_stock_alert','Low stock alert: {{product_name}}','<p>{{product_name}} stock is at {{stock}} (threshold {{threshold}}).</p>',true),
('purchase_order','Purchase order {{po_number}}','<p>New purchase order attached for supplier {{supplier_name}}.</p>',true)
ON CONFLICT (code) DO NOTHING;

-- Popups
INSERT INTO public.popups (name, title, body, cta_label, cta_url, trigger_type, trigger_value, is_active) VALUES
('Newsletter — 10% off','Join the atelier list','Subscribe for early access to drops and 10% off your first order.','Subscribe','/#newsletter','delay',8,true),
('Free shipping over $150','Complimentary worldwide shipping','On every order over $150 — no code required.',NULL,NULL,'delay',20,false)
ON CONFLICT DO NOTHING;

-- Reviews (need a real user — use only existing profile)
INSERT INTO public.reviews (product_id, user_id, rating, title, body, is_approved)
SELECT p.id, (SELECT id FROM public.profiles LIMIT 1), v.rating, v.title, v.body, true
FROM public.products p
CROSS JOIN LATERAL (VALUES
  (5,'Exceptional','The finish and drape are exactly as pictured. A future heirloom.'),
  (5,'Refined','Discreet luxury done right — packaging alone was a moment.'),
  (4,'Very good','A touch above expectations. Delivery was fast and immaculate.')
) AS v(rating,title,body)
WHERE p.slug IN ('onyx-silk-trench','golden-hour-timepiece','amber-noir-edp','cashmere-ribbed-sweater','vellum-leather-tote')
AND EXISTS (SELECT 1 FROM public.profiles)
ON CONFLICT DO NOTHING;

-- Product Q&A (no name column; is_answered doesn't exist)
INSERT INTO public.product_questions (product_id, question, answer, answered_at, is_approved)
SELECT p.id, v.question, v.answer, now(), true
FROM public.products p
CROSS JOIN LATERAL (VALUES
  ('Is this true to size?','Yes — most customers find it true to size. Consider sizing up for a relaxed fit.'),
  ('What is the care recommendation?','Dry clean only. Store on a padded hanger to preserve the drape.')
) AS v(question,answer)
WHERE p.slug IN ('onyx-silk-trench','cashmere-ribbed-sweater','vellum-leather-tote')
ON CONFLICT DO NOTHING;

-- Newsletter subscribers
INSERT INTO public.newsletter_subscribers (email) VALUES
('elena.marchetti@example.com'),('james.whitmore@example.com'),
('aiko.tanaka@example.com'),('sophia.alvarez@example.com'),('marc.dubois@example.com')
ON CONFLICT DO NOTHING;

-- Contact submissions
INSERT INTO public.contact_submissions (name, email, subject, message) VALUES
('Marc Dubois','marc.dubois@example.com','Wholesale enquiry','Interested in wholesale terms for a Paris concept store.'),
('Priya Nair','priya.nair@example.com','Gift with purchase','Do you offer engraving on the timepiece? Thank you.'),
('Tom Becker','tom.becker@example.com','Delivery question','How long to Berlin?')
ON CONFLICT DO NOTHING;
