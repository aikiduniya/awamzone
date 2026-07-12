// Customer-facing product media gallery with:
// - Image zoom on hover / click-to-fullscreen
// - Video (mp4/webm) playback
// - YouTube / Vimeo embeds
// - Fullscreen lightbox with keyboard + swipe navigation
// Works with existing `images: string[]` (mixed URLs).
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X, ZoomIn } from "lucide-react";
import { classifyMediaList, type MediaItem } from "@/lib/media";
import { cn } from "@/lib/utils";

interface Props {
  urls: string[];
  alt: string;
  aspect?: string; // tailwind aspect class, default 4/5
}

export function ProductGallery({ urls, alt, aspect = "aspect-[4/5]" }: Props) {
  const items = useMemo(() => classifyMediaList(urls), [urls]);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setActive((i) => (i >= items.length ? 0 : i));
  }, [items.length]);

  if (items.length === 0) {
    return <div className={cn(aspect, "bg-surface")} />;
  }

  const current = items[active];

  const next = () => setActive((i) => (i + 1) % items.length);
  const prev = () => setActive((i) => (i - 1 + items.length) % items.length);

  return (
    <div>
      <MainPane
        item={current}
        alt={alt}
        aspect={aspect}
        zoom={zoom}
        setZoom={setZoom}
        openLightbox={() => setLightbox(true)}
      />

      {items.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-3">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-square overflow-hidden bg-surface transition",
                i === active ? "ring-2 ring-primary" : "ring-1 ring-border/50 hover:ring-primary/60",
              )}
              aria-label={`View media ${i + 1}`}
              type="button"
            >
              <Thumb item={it} alt={`${alt} ${i + 1}`} />
              {it.kind !== "image" && (
                <span className="absolute inset-0 grid place-items-center bg-black/30 text-white">
                  <Play size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <Lightbox
          items={items}
          index={active}
          setIndex={setActive}
          onClose={() => setLightbox(false)}
          onPrev={prev}
          onNext={next}
          alt={alt}
        />
      )}
    </div>
  );
}

function Thumb({ item, alt }: { item: MediaItem; alt: string }) {
  if (item.kind === "image") return <img src={item.url} alt={alt} className="h-full w-full object-cover" loading="lazy" />;
  if (item.kind === "youtube" && item.thumbnail)
    return <img src={item.thumbnail} alt={alt} className="h-full w-full object-cover" loading="lazy" />;
  if (item.kind === "video")
    return <video src={item.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />;
  // vimeo fallback (no cheap thumbnail without API)
  return <div className="h-full w-full grid place-items-center bg-black text-white/60 text-[10px] uppercase tracking-widest">Vimeo</div>;
}

function MainPane({
  item,
  alt,
  aspect,
  zoom,
  setZoom,
  openLightbox,
}: {
  item: MediaItem;
  alt: string;
  aspect: string;
  zoom: { x: number; y: number } | null;
  setZoom: (z: { x: number; y: number } | null) => void;
  openLightbox: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = (e: React.MouseEvent) => {
    if (item.kind !== "image") return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setZoom({ x, y });
  };

  if (item.kind === "image") {
    return (
      <div
        ref={ref}
        className={cn(aspect, "relative overflow-hidden bg-surface cursor-zoom-in group")}
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
        onClick={openLightbox}
      >
        <img
          src={item.url}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-300"
          style={
            zoom
              ? { transformOrigin: `${zoom.x}% ${zoom.y}%`, transform: "scale(2)" }
              : undefined
          }
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openLightbox(); }}
          className="absolute bottom-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-background/80 border border-border text-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition"
          aria-label="Open fullscreen"
        >
          <ZoomIn size={14} />
        </button>
      </div>
    );
  }

  if (item.kind === "video") {
    return (
      <div className={cn(aspect, "relative overflow-hidden bg-black")}>
        <video src={item.url} controls playsInline className="h-full w-full object-contain" />
      </div>
    );
  }

  // youtube / vimeo
  return (
    <div className={cn(aspect, "relative overflow-hidden bg-black")}>
      <iframe
        src={item.embedUrl}
        title={alt}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

function Lightbox({
  items,
  index,
  setIndex,
  onClose,
  onPrev,
  onNext,
  alt,
}: {
  items: MediaItem[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  alt: string;
}) {
  const touchStart = useRef<number | null>(null);
  const it = items[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onPrev, onNext]);

  const onTouchStart = (e: React.TouchEvent) => (touchStart.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 40) (dx > 0 ? onPrev : onNext)();
    touchStart.current = null;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X size={18} />
      </button>
      {items.length > 1 && (
        <>
          <button
            onClick={onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Previous"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Next"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
      <div
        className="max-h-[85vh] max-w-[92vw] w-full h-full flex items-center justify-center px-6"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {it.kind === "image" && (
          <img src={it.url} alt={alt} className="max-h-[85vh] max-w-full object-contain" />
        )}
        {it.kind === "video" && (
          <video src={it.url} controls autoPlay playsInline className="max-h-[85vh] max-w-full" />
        )}
        {(it.kind === "youtube" || it.kind === "vimeo") && (
          <div className="w-full max-w-4xl aspect-video">
            <iframe
              src={it.embedUrl}
              title={alt}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}
      </div>
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[92vw] overflow-x-auto px-4">
          {items.map((thumb, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={cn(
                "h-14 w-14 shrink-0 overflow-hidden rounded border transition",
                i === index ? "border-primary opacity-100" : "border-white/20 opacity-60 hover:opacity-100",
              )}
              aria-label={`View ${i + 1}`}
            >
              <Thumb item={thumb} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
