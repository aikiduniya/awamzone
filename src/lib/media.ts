// Media URL classifier + embed builders. Works with the existing `images: string[]`
// column — no schema change needed. Supports images, direct video files,
// YouTube, and Vimeo URLs mixed in the same array.
export type MediaKind = "image" | "video" | "youtube" | "vimeo";

export interface MediaItem {
  url: string;
  kind: MediaKind;
  embedUrl?: string; // for youtube/vimeo iframes
  videoId?: string;
  thumbnail?: string;
}

const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;

export function parseYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts|v)\/([^/?#]+)/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

export function parseVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.replace(/^www\./, "").endsWith("vimeo.com")) return null;
    const m = u.pathname.match(/\/(\d+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function classifyMedia(url: string): MediaItem {
  if (!url) return { url, kind: "image" };
  const yt = parseYouTubeId(url);
  if (yt) {
    return {
      url,
      kind: "youtube",
      videoId: yt,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1`,
      thumbnail: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
    };
  }
  const vm = parseVimeoId(url);
  if (vm) {
    return {
      url,
      kind: "vimeo",
      videoId: vm,
      embedUrl: `https://player.vimeo.com/video/${vm}`,
    };
  }
  if (VIDEO_EXT.test(url) || /content-type=video/i.test(url)) {
    return { url, kind: "video" };
  }
  return { url, kind: "image" };
}

export function classifyMediaList(urls: string[] | null | undefined): MediaItem[] {
  return (urls ?? []).filter(Boolean).map(classifyMedia);
}

export function thumbnailFor(item: MediaItem): string | null {
  if (item.kind === "image") return item.url;
  if (item.kind === "youtube") return item.thumbnail ?? null;
  return null;
}
