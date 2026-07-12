import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Image as ImageIcon, Trash2, Search, FolderPlus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BUCKET = "media";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

export type MediaAsset = {
  id: string;
  path: string;
  folder: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  alt_text: string | null;
  created_at: string;
  url?: string;
};

async function signUrl(path: string): Promise<string> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? "";
}

export async function uploadFile(file: File, folder = ""): Promise<MediaAsset | null> {
  const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder ? folder.replace(/^\/+|\/+$/g, "") + "/" : ""}${Date.now()}_${clean}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) { toast.error(upErr.message); return null; }
  const { data: userData } = await supabase.auth.getUser();
  const { data: inserted, error } = await supabase.from("media_assets").insert({
    path,
    folder: folder.replace(/^\/+|\/+$/g, ""),
    filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: userData.user?.id ?? null,
  }).select().single();
  if (error) { toast.error(error.message); return null; }
  const url = await signUrl(path);
  return { ...(inserted as any), url };
}

export function MediaLibrary({ onPick, multi = false, folder }: { onPick?: (urls: string[], assets: MediaAsset[]) => void; multi?: boolean; folder?: string }) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [currentFolder, setCurrentFolder] = useState(folder ?? "");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("media_assets").select("*").order("created_at", { ascending: false }).limit(200);
    if (currentFolder) query = query.eq("folder", currentFolder);
    const { data } = await query;
    const rows = (data ?? []) as MediaAsset[];
    const withUrls = await Promise.all(rows.map(async (r) => ({ ...r, url: await signUrl(r.path) })));
    setAssets(withUrls);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [currentFolder]);

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const f of Array.from(files)) {
      await uploadFile(f, currentFolder);
    }
    setUploading(false);
    load();
  };

  const del = async (a: MediaAsset) => {
    if (!confirm("Delete this file?")) return;
    await supabase.storage.from(BUCKET).remove([a.path]);
    await supabase.from("media_assets").delete().eq("id", a.id);
    load();
  };

  const filtered = assets.filter((a) => (q ? a.filename.toLowerCase().includes(q.toLowerCase()) : true));

  const toggle = (id: string) => {
    if (multi) setSelected((s) => ({ ...s, [id]: !s[id] }));
    else setSelected({ [id]: true });
  };

  const confirm_ = () => {
    const picked = assets.filter((a) => selected[a.id]);
    onPick?.(picked.map((p) => p.url!), picked);
  };

  const newFolder = () => {
    const name = prompt("Folder name (e.g. products, banners)");
    if (name) setCurrentFolder(name.replace(/^\/+|\/+$/g, ""));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <select value={currentFolder} onChange={(e) => setCurrentFolder(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="">All folders</option>
          {[...new Set(assets.map((a) => a.folder).filter(Boolean))].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" onClick={newFolder}><FolderPlus size={14} className="mr-1" /> Folder</Button>
        <label className="inline-flex">
          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files)} />
          <span className={cn("inline-flex items-center gap-1 h-9 px-3 rounded-md text-sm cursor-pointer bg-primary text-primary-foreground hover:opacity-90", uploading && "opacity-50 pointer-events-none")}>
            <Upload size={14} /> {uploading ? "Uploading…" : "Upload"}
          </span>
        </label>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded">No media yet. Upload files to get started.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto">
          {filtered.map((a) => (
            <div key={a.id} className={cn("group relative border rounded overflow-hidden cursor-pointer", selected[a.id] && "ring-2 ring-primary")} onClick={() => toggle(a.id)}>
              {a.mime_type?.startsWith("image/") ? (
                <img src={a.url} alt={a.alt_text ?? a.filename} className="aspect-square object-cover w-full" loading="lazy" />
              ) : (
                <div className="aspect-square grid place-items-center bg-muted"><ImageIcon size={24} /></div>
              )}
              <div className="p-1.5 text-[10px] truncate bg-background/80">{a.filename}</div>
              <button type="button" onClick={(e) => { e.stopPropagation(); del(a); }} className="absolute top-1 right-1 p-1 rounded bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {onPick && (
        <div className="flex justify-end pt-2 border-t">
          <Button type="button" onClick={confirm_} disabled={Object.values(selected).every((v) => !v)}>Use selected</Button>
        </div>
      )}
    </div>
  );
}

export function MediaPicker({ onPick, multi = false, trigger, folder }: { onPick: (urls: string[]) => void; multi?: boolean; trigger?: React.ReactNode; folder?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button type="button" variant="outline" size="sm"><ImageIcon size={14} className="mr-1" /> Choose from library</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Media library</DialogTitle></DialogHeader>
        <MediaLibrary
          multi={multi}
          folder={folder}
          onPick={(urls) => { onPick(urls); setOpen(false); }}
        />
      </DialogContent>
    </Dialog>
  );
}
