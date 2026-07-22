import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/site-header";
import { ProductCard } from "@/components/site/product-card";
import { SectionHeading } from "@/components/site/section-heading";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: sections } = useQuery({
    queryKey: ["home_sections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("home_sections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  return (
    <SiteShell>
      <HeroBanner />
      {sections?.map((s) => <SectionRenderer key={s.id} section={s} />)}
    </SiteShell>
  );
}

type HeroSlide = {
  id: string;
  title: string | null; subtitle: string | null; kicker: string | null;
  desktop_image: string | null; mobile_image: string | null; video_url: string | null;
  background_color: string | null; overlay_opacity: number | null;
  text_align: string | null; text_position: string | null;
  primary_label: string | null; primary_link: string | null;
  secondary_label: string | null; secondary_link: string | null;
};

function HeroBanner() {
  const { data: slides = [] } = useQuery({
    queryKey: ["public-hero-slides"],
    queryFn: async () => {
      const { data } = await supabase.from("hero_slides").select("*").order("sort_order");
      return (data ?? []) as HeroSlide[];
    },
  });
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;
  const active = slides[Math.min(i, slides.length - 1)];
  const isVideo = !!active.video_url;
  const alignCls = active.text_align === "center" ? "mx-auto text-center items-center" : active.text_align === "right" ? "ml-auto text-right items-end" : "text-left items-start";
  const posCls = active.text_position === "top" ? "items-start pt-24" : active.text_position === "bottom" ? "items-end pb-24" : "items-center";

  return (
    <section className="relative h-[92vh] min-h-[620px] w-full overflow-hidden bg-black" style={active.background_color ? { backgroundColor: active.background_color } : undefined}>
      {isVideo ? (
        <video
          key={active.id}
          src={active.video_url!}
          autoPlay muted loop playsInline
          className="absolute inset-0 h-full w-full object-cover scale-105"
        />
      ) : (
        <picture>
          {active.mobile_image && <source media="(max-width: 640px)" srcSet={active.mobile_image} />}
          <img
            key={active.id}
            src={active.desktop_image || active.mobile_image || ""}
            alt={active.title ?? ""}
            className="absolute inset-0 h-full w-full object-cover animate-in fade-in zoom-in-105 duration-[1400ms] ease-out"
          />
        </picture>
      )}
      {/* Cinematic gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/20" />
      <div className="absolute inset-0" style={{ opacity: active.overlay_opacity ?? 0, backgroundColor: "black" }} />

      {/* Top ornamental hairline */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className={`container-luxe relative z-10 flex h-full ${posCls}`}>
        <div className={`flex flex-col gap-6 max-w-2xl ${alignCls} animate-in fade-in slide-in-from-bottom-6 duration-1000`}>
          {active.kicker && (
            <div className="inline-flex items-center gap-3 text-primary text-[11px] uppercase tracking-[0.4em]">
              <span className="h-px w-10 bg-primary/70" />
              {active.kicker}
              <span className="h-px w-10 bg-primary/70" />
            </div>
          )}
          {active.title && (
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif leading-[1.02] text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
              {active.title}
            </h1>
          )}
          {active.subtitle && (
            <p className="text-white/85 text-base md:text-lg max-w-lg leading-relaxed drop-shadow">
              {active.subtitle}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-4">
            {active.primary_label && (
              <Link to={active.primary_link || "/shop"} className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-4 text-xs uppercase tracking-[0.32em] hover:bg-primary/90 transition-all shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]">
                {active.primary_label}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            )}
            {active.secondary_label && (
              <Link to={active.secondary_link || "/shop"} className="inline-flex items-center border border-white/70 text-white px-10 py-4 text-xs uppercase tracking-[0.32em] hover:bg-white hover:text-black transition-all backdrop-blur-sm">
                {active.secondary_label}
              </Link>
            )}
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center gap-3">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setI(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={`h-[3px] rounded-full transition-all duration-500 ${idx === i ? "w-14 bg-primary" : "w-6 bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>
      )}

      {/* Scroll cue */}
      <div className="absolute bottom-6 right-6 z-10 hidden md:flex items-center gap-3 text-white/60 text-[10px] uppercase tracking-[0.32em]">
        <span>Scroll</span>
        <span className="block h-8 w-px bg-white/40 animate-pulse" />
      </div>
    </section>
  );
}

function SectionRenderer({ section }: { section: any }) {
  switch (section.section_type) {
    case "hero":
      return <HeroSection section={section} />;
    case "featured_categories":
      return <FeaturedCategoriesSection section={section} />;
    case "featured_products":
    case "trending":
    case "new_arrivals":
    case "best_sellers":
      return <ProductStripSection section={section} />;
    case "banner":
      return <BannerSection section={section} />;
    case "brand_slider":
      return <BrandSlider section={section} />;
    case "testimonials":
      return <Testimonials section={section} />;
    case "newsletter":
      return <NewsletterSection section={section} />;
    default:
      return null;
  }
}

function HeroSection({ section }: { section: any }) {
  const slides: any[] = section.config?.slides ?? [];
  const slide = slides[0];
  if (!slide) return null;
  return (
    <section className="relative h-[85vh] min-h-[560px] w-full overflow-hidden">
      <img src={slide.image} alt={slide.heading} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/50 to-transparent" />
      <div className="container-luxe relative z-10 flex h-full items-center">
        <div className={`max-w-xl ${slide.align === "center" ? "mx-auto text-center" : ""}`}>
          <div className="eyebrow mb-4">{section.subtitle}</div>
          <h1 className="text-5xl md:text-7xl font-serif leading-[1.05] text-foreground">
            {slide.heading}
          </h1>
          <p className="mt-6 text-muted-foreground max-w-md leading-relaxed">{slide.subheading}</p>
          {slide.cta_label && (
            <Link
              to={slide.cta_url || "/shop"}
              className="mt-10 inline-flex items-center border border-primary bg-primary text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.28em] hover:bg-transparent hover:text-primary transition"
            >
              {slide.cta_label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function FeaturedCategoriesSection({ section }: { section: any }) {
  const { data } = useQuery({
    queryKey: ["home", "featured-categories", section.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, image_url")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("sort_order")
        .limit(section.config?.limit ?? 6);
      return data ?? [];
    },
  });
  return (
    <section className="container-luxe py-24">
      <SectionHeading eyebrow={section.subtitle} title={section.title} description={section.description} align="center" />
      <div className="mt-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {data?.map((c) => (
          <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }} className="group block">
            <div className="aspect-square overflow-hidden bg-surface">
              <img src={c.image_url ?? ""} alt={c.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
            <div className="mt-3 text-center text-xs uppercase tracking-[0.22em] group-hover:text-primary transition-colors">
              {c.name}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductStripSection({ section }: { section: any }) {
  const filter = section.config?.filter ?? "is_featured";
  const { data } = useQuery({
    queryKey: ["home", "product-strip", section.id, filter],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, sale_price, images, stock")
        .eq("status", "active")
        .eq(filter, true)
        .limit(section.config?.limit ?? 8);
      return data ?? [];
    },
  });
  if (!data?.length) return null;
  return (
    <section className="container-luxe py-20">
      <div className="flex items-end justify-between gap-4 mb-10">
        <SectionHeading eyebrow={section.subtitle} title={section.title} description={section.description} />
        <Link to="/shop" className="hidden md:inline text-xs uppercase tracking-[0.24em] text-primary hover:underline">
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
        {data.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

function BannerSection({ section }: { section: any }) {
  const cfg = section.config ?? {};
  return (
    <section className="container-luxe py-16">
      <div className="relative overflow-hidden">
        <img src={cfg.image} alt={section.title ?? ""} className="w-full h-[420px] object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        <div className="absolute inset-0 flex items-end p-10 md:p-16">
          <div className="max-w-lg">
            <div className="eyebrow mb-3">{section.subtitle}</div>
            <h3 className="text-3xl md:text-4xl font-serif">{section.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{section.description}</p>
            {cfg.cta_label && (
              <Link to={cfg.cta_url || "/shop"} className="mt-6 inline-block text-xs uppercase tracking-[0.24em] text-primary border-b border-primary pb-1">
                {cfg.cta_label} →
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function BrandTile({ brand }: { brand: { id: string; name: string; slug: string; logo_url: string | null } }) {
  const [failed, setFailed] = useState(false);
  const isUnavailableProvider = brand.logo_url?.includes("logo.clearbit.com");
  const showImg = brand.logo_url && !isUnavailableProvider && !failed;
  const initials = brand.name
    .split(/\s|&/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return (
    <Link
      to="/shop"
      search={{ brand: brand.slug } as any}
      className="shrink-0 group"
      title={brand.name}
    >
      <div className="h-28 w-48 grid place-items-center px-6 rounded-md border border-border/60 bg-card/60 backdrop-blur hover:border-primary/60 hover:bg-card transition-all duration-500">
        {showImg ? (
          <img
            src={brand.logo_url!}
            alt={brand.name}
            onError={() => setFailed(true)}
            className="max-h-14 max-w-full object-contain opacity-90 group-hover:opacity-100 transition duration-500"
            loading="lazy"
          />
        ) : (
          <span className="flex items-center gap-3 text-foreground/80 group-hover:text-primary transition-colors">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-current/25 font-serif text-sm font-semibold uppercase">
              {initials}
            </span>
            <span className="font-serif text-base uppercase tracking-[0.14em] whitespace-nowrap">
              {brand.name}
            </span>
          </span>
        )}
      </div>
    </Link>
  );
}

function BrandSlider({ section }: { section: any }) {
  const { data } = useQuery({
    queryKey: ["home", "brands-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("brands")
        .select("id,name,slug,logo_url")
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
  });
  if (!data?.length) return null;
  const loop = [...data, ...data];
  return (
    <section className="py-24 bg-gradient-to-b from-background via-surface/40 to-background border-y border-border overflow-hidden">
      <div className="container-luxe">
        <SectionHeading eyebrow={section.subtitle} title={section.title} description={section.description} align="center" />
      </div>
      <div className="mt-14 relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="flex gap-8 animate-brand-marquee whitespace-nowrap">
          {loop.map((b, i) => (
            <BrandTile key={`${b.id}-${i}`} brand={b} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials({ section }: { section: any }) {
  const items = section.config?.items ?? [];
  if (!items.length) return null;
  return (
    <section className="bg-surface py-24 border-y border-border">
      <div className="container-luxe">
        <SectionHeading eyebrow={section.subtitle} title={section.title} align="center" />
        <div className="mt-14 grid md:grid-cols-3 gap-8">
          {items.map((t: any, i: number) => (
            <figure
              key={i}
              className="relative bg-card border border-border rounded-lg p-8 hover:border-primary/60 hover:shadow-[0_10px_40px_-15px_rgba(0,0,0,0.4)] transition-all duration-500"
            >
              <span aria-hidden className="absolute -top-6 left-6 font-serif text-7xl leading-none text-primary/40 select-none">
                &ldquo;
              </span>
              <div className="flex items-center gap-1 text-primary mb-4 relative">
                {"★".repeat(t.rating ?? 5)}
                <span className="text-muted-foreground">{"★".repeat(5 - (t.rating ?? 5))}</span>
              </div>
              <blockquote className="text-[15px] leading-relaxed text-foreground/90 relative">
                {t.quote}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 pt-6 border-t border-border/60">
                {t.avatar && (
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="h-11 w-11 rounded-full object-cover border border-primary/30"
                    loading="lazy"
                  />
                )}
                <div>
                  <div className="font-serif text-base text-foreground">{t.name}</div>
                  {t.role && <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{t.role}</div>}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}


function NewsletterSection({ section }: { section: any }) {
  return (
    <section className="container-luxe py-24">
      <div className="border border-border p-10 md:p-20 text-center">
        <SectionHeading eyebrow={section.subtitle} title={section.title} description={section.description} align="center" />
        <form className="mt-10 max-w-md mx-auto flex gap-2" onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const email = String(f.get("email") ?? "");
          if (!email) return;
          const { error } = await supabase.from("newsletter_subscribers").insert({ email });
          const { toast } = await import("sonner");
          if (error && !error.message.includes("duplicate")) toast.error("Try again");
          else { toast.success("Welcome to the house."); (e.currentTarget as HTMLFormElement).reset(); }
        }}>
          <input name="email" type="email" required placeholder="Your email address" className="flex-1 bg-transparent border-b border-border py-3 focus:outline-none focus:border-primary" />
          <button className="border border-primary bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.24em] hover:bg-transparent hover:text-primary transition">Join</button>
        </form>
      </div>
    </section>
  );
}
