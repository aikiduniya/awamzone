
-- Media assets: title / caption / description
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS description text;

-- Profiles: dob, gender, email preferences
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS email_marketing boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_orders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_product_news boolean NOT NULL DEFAULT true;

-- Addresses: label, type, split default flags
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS address_type text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS is_default_shipping boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_default_billing boolean NOT NULL DEFAULT false;

-- Menu items: icon, target, visibility, css class, description
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS target text NOT NULL DEFAULT '_self',
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS role_required text,
  ADD COLUMN IF NOT EXISTS css_class text,
  ADD COLUMN IF NOT EXISTS description text;

-- SEO columns helper: add to entity tables
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['products','categories','brands','blog_posts','pages']) LOOP
    EXECUTE format('ALTER TABLE public.%I
      ADD COLUMN IF NOT EXISTS meta_keywords text,
      ADD COLUMN IF NOT EXISTS canonical_url text,
      ADD COLUMN IF NOT EXISTS robots text NOT NULL DEFAULT ''index,follow'',
      ADD COLUMN IF NOT EXISTS og_title text,
      ADD COLUMN IF NOT EXISTS og_description text,
      ADD COLUMN IF NOT EXISTS og_image text,
      ADD COLUMN IF NOT EXISTS twitter_title text,
      ADD COLUMN IF NOT EXISTS twitter_description text,
      ADD COLUMN IF NOT EXISTS twitter_image text,
      ADD COLUMN IF NOT EXISTS schema_markup jsonb', t);
  END LOOP;
END $$;

-- Contact submissions: phone, replied flag, audit fields
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS replied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;
