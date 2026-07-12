import { useEffect, useState } from "react";

const KEY = "compare:v1";
const listeners = new Set<() => void>();

function read(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(v: string[]) {
  localStorage.setItem(KEY, JSON.stringify(v));
  listeners.forEach((l) => l());
}

export function useCompareIds(): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(read());
    const l = () => setIds(read());
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return ids;
}

export function toggleCompare(id: string) {
  const cur = read();
  if (cur.includes(id)) write(cur.filter((x) => x !== id));
  else write([...cur, id].slice(-4));
}
export function removeCompare(id: string) { write(read().filter((x) => x !== id)); }
export function clearCompare() { write([]); }
export function isInCompare(id: string) { return read().includes(id); }
