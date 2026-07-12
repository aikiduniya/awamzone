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
      {sections?.map((s) => <SectionRenderer key={s.id} section={s} />)}
    </SiteShell>
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

function BrandSlider({ section }: { section: any }) {
  const { data } = useQuery({
    queryKey: ["home", "brands"],
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("*").eq("is_active", true).eq("is_featured", true).order("sort_order");
      return data ?? [];
    },
  });
  if (!data?.length) return null;
  return (
    <section className="container-luxe py-16">
      <SectionHeading eyebrow={section.subtitle} title={section.title} description={section.description} align="center" />
      <div className="mt-12 flex flex-wrap items-center justify-center gap-x-16 gap-y-8">
        {data.map((b) => (
          <div key={b.id} className="text-2xl font-serif tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors">
            {b.name}
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials({ section }: { section: any }) {
  const items = section.config?.items ?? [];
  return (
    <section className="bg-surface py-24">
      <div className="container-luxe">
        <SectionHeading eyebrow={section.subtitle} title={section.title} align="center" />
        <div className="mt-14 grid md:grid-cols-3 gap-10">
          {items.map((t: any, i: number) => (
            <div key={i} className="text-center">
              <div className="text-primary text-3xl font-serif">"</div>
              <p className="italic text-foreground/90 leading-relaxed">{t.quote}</p>
              <div className="mt-4 eyebrow">{t.name} · {t.role}</div>
            </div>
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
