
CREATE TABLE IF NOT EXISTS public.hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  subtitle TEXT,
  kicker TEXT,
  desktop_image TEXT,
  mobile_image TEXT,
  video_url TEXT,
  background_color TEXT,
  overlay_opacity NUMERIC DEFAULT 0.4,
  text_align TEXT DEFAULT 'left',
  text_position TEXT DEFAULT 'center',
  primary_label TEXT,
  primary_link TEXT,
  secondary_label TEXT,
  secondary_link TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hero_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_slides TO authenticated;
GRANT ALL ON public.hero_slides TO service_role;

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active hero slides"
  ON public.hero_slides FOR SELECT
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY "Admins can view all hero slides"
  ON public.hero_slides FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage hero slides"
  ON public.hero_slides FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER hero_slides_updated_at BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Demo data
INSERT INTO public.hero_slides (kicker, title, subtitle, desktop_image, mobile_image, primary_label, primary_link, secondary_label, secondary_link, text_align, text_position, overlay_opacity, sort_order)
VALUES
  ('New Collection', 'Timeless Elegance', 'Discover our curated luxury collection — pieces designed to be treasured for generations.',
   'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920',
   'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
   'Shop the Collection', '/shop', 'Explore Journal', '/blog', 'left', 'center', 0.45, 1),
  ('Autumn 2026', 'Crafted With Intention', 'Signature silhouettes reimagined in warm neutrals — from studio to soirée.',
   'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920',
   'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
   'Discover Now', '/shop', NULL, NULL, 'center', 'center', 0.4, 2),
  ('Limited Edition', 'The Atelier Series', 'Numbered pieces, hand-finished in our Milan atelier. Only fifty of each.',
   'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1920',
   'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
   'Reserve Yours', '/shop', 'Learn More', '/pages/atelier', 'right', 'center', 0.5, 3);
