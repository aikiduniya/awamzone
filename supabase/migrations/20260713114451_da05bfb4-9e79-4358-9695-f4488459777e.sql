
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS show_in_header boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_in_footer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS menu_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS show_in_header boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS pages_show_in_header_idx ON public.pages(show_in_header) WHERE show_in_header = true;
CREATE INDEX IF NOT EXISTS pages_show_in_footer_idx ON public.pages(show_in_footer) WHERE show_in_footer = true;
CREATE INDEX IF NOT EXISTS categories_show_in_header_idx ON public.categories(show_in_header) WHERE show_in_header = true;
