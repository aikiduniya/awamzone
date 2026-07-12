import { useEffect, useState } from "react";

const KEY = "recently-viewed:v1";

export function useRecentlyViewed(): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try { setIds(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setIds([]); }
  }, []);
  return ids;
}

export function pushRecentlyViewed(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const cur: string[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    const next = [id, ...cur.filter((x) => x !== id)].slice(0, 12);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}
