import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/products/$id")({
  component: ProductEditor,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ProductEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [saving, setSaving] = useState(false);

  const [f, setF] = useState<any>({
    name: "", slug: "", sku: "", short_description: "", description: "",
    price: 0, sale_price: null, cost_price: null, stock: 0, low_stock_threshold: 5,
    category_id: null, brand_id: null, images: [] as string[], tags: [] as string[],
    weight: null, length: null, width: null, height: null,
    meta_title: "", meta_description: "", meta_keywords: "",
    is_featured: false, is_trending: false, is_new_arrival: false, is_best_seller: false,
    status: "active", warranty: "", return_policy: "",
  });
  const [imgInput, setImgInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const { data: cats } = useQuery({ queryKey: ["all-cats"], queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [] });
  const { data: brands } = useQuery({ queryKey: ["all-brands"], queryFn: async () => (await supabase.from("brands").select("id,name").order("name")).data ?? [] });

  useEffect(() => {
    if (isNew) return;
    supabase.from("products").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) setF({ ...data, images: data.images ?? [], tags: data.tags ?? [] });
    });
  }, [id, isNew]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...f,
        slug: f.slug || slugify(f.name),
        price: Number(f.price),
        sale_price: f.sale_price ? Number(f.sale_price) : null,
        cost_price: f.cost_price ? Number(f.cost_price) : null,
        stock: Number(f.stock),
        low_stock_threshold: f.low_stock_threshold ? Number(f.low_stock_threshold) : null,
        weight: f.weight ? Number(f.weight) : null,
        length: f.length ? Number(f.length) : null,
        width: f.width ? Number(f.width) : null,
        height: f.height ? Number(f.height) : null,
      };
      if (isNew) {
        const { data, error } = await supabase.from("products").insert(payload).select().single();
        if (error) throw error;
        toast.success("Product created");
        navigate({ to: "/admin/products/$id", params: { id: data.id } });
      } else {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;
        toast.success("Saved");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addImg = () => { if (imgInput) { setF({ ...f, images: [...f.images, imgInput] }); setImgInput(""); } };
  const rmImg = (i: number) => setF({ ...f, images: f.images.filter((_: any, idx: number) => idx !== i) });
  const addTag = () => { if (tagInput) { setF({ ...f, tags: [...f.tags, tagInput] }); setTagInput(""); } };
  const rmTag = (t: string) => setF({ ...f, tags: f.tags.filter((x: string) => x !== t) });

  const Input = ({ label, ...rest }: any) => (
    <label className="block"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</div>
      <input className="w-full bg-transparent border border-border px-3 py-2" {...rest} />
    </label>
  );

  return (
    <form onSubmit={save}>
      <Link to="/admin/products" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary mb-4"><ArrowLeft size={14} /> Back</Link>
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="eyebrow mb-2">{isNew ? "Create" : "Edit"}</div>
          <h1 className="text-4xl font-serif">{isNew ? "New Product" : f.name || "Product"}</h1>
        </div>
        <button disabled={saving} className="border border-primary bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="border border-border p-6 space-y-4">
            <h3 className="font-serif text-xl">Basic</h3>
            <Input label="Name" value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) })} required />
            <Input label="Slug (URL)" value={f.slug} onChange={(e: any) => setF({ ...f, slug: e.target.value })} />
            <Input label="SKU" value={f.sku ?? ""} onChange={(e: any) => setF({ ...f, sku: e.target.value })} />
            <label className="block"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Short description</div>
              <textarea rows={2} value={f.short_description ?? ""} onChange={(e) => setF({ ...f, short_description: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
            </label>
            <label className="block"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Full description</div>
              <textarea rows={6} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
            </label>
          </section>

          <section className="border border-border p-6 space-y-4">
            <h3 className="font-serif text-xl">Media</h3>
            <div className="grid grid-cols-4 gap-3">
              {f.images.map((src: string, i: number) => (
                <div key={i} className="relative aspect-square bg-surface">
                  <img src={src} className="h-full w-full object-cover" alt="" />
                  <button type="button" onClick={() => rmImg(i)} className="absolute top-1 right-1 bg-background/80 p-1"><X size={12} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={imgInput} onChange={(e) => setImgInput(e.target.value)} placeholder="Paste image URL" className="flex-1 bg-transparent border border-border px-3 py-2" />
              <button type="button" onClick={addImg} className="border border-primary text-primary px-4 text-xs uppercase tracking-[0.2em]">Add</button>
            </div>
          </section>

          <section className="border border-border p-6 space-y-4">
            <h3 className="font-serif text-xl">Pricing & Inventory</h3>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Price" type="number" step="0.01" value={f.price} onChange={(e: any) => setF({ ...f, price: e.target.value })} />
              <Input label="Sale price" type="number" step="0.01" value={f.sale_price ?? ""} onChange={(e: any) => setF({ ...f, sale_price: e.target.value || null })} />
              <Input label="Cost price" type="number" step="0.01" value={f.cost_price ?? ""} onChange={(e: any) => setF({ ...f, cost_price: e.target.value || null })} />
              <Input label="Stock" type="number" value={f.stock} onChange={(e: any) => setF({ ...f, stock: e.target.value })} />
              <Input label="Low stock alert" type="number" value={f.low_stock_threshold ?? ""} onChange={(e: any) => setF({ ...f, low_stock_threshold: e.target.value })} />
            </div>
          </section>

          <section className="border border-border p-6 space-y-4">
            <h3 className="font-serif text-xl">Shipping</h3>
            <div className="grid grid-cols-4 gap-3">
              <Input label="Weight (kg)" type="number" step="0.01" value={f.weight ?? ""} onChange={(e: any) => setF({ ...f, weight: e.target.value })} />
              <Input label="Length (cm)" type="number" value={f.length ?? ""} onChange={(e: any) => setF({ ...f, length: e.target.value })} />
              <Input label="Width" type="number" value={f.width ?? ""} onChange={(e: any) => setF({ ...f, width: e.target.value })} />
              <Input label="Height" type="number" value={f.height ?? ""} onChange={(e: any) => setF({ ...f, height: e.target.value })} />
            </div>
          </section>

          <section className="border border-border p-6 space-y-4">
            <h3 className="font-serif text-xl">SEO</h3>
            <Input label="Meta title" value={f.meta_title ?? ""} onChange={(e: any) => setF({ ...f, meta_title: e.target.value })} />
            <label className="block"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Meta description</div>
              <textarea rows={2} value={f.meta_description ?? ""} onChange={(e) => setF({ ...f, meta_description: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2" />
            </label>
            <Input label="Keywords" value={f.meta_keywords ?? ""} onChange={(e: any) => setF({ ...f, meta_keywords: e.target.value })} />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="border border-border p-6 space-y-4">
            <h3 className="font-serif text-xl">Organization</h3>
            <label className="block"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Status</div>
              <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2">
                <option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
              </select>
            </label>
            <label className="block"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Category</div>
              <select value={f.category_id ?? ""} onChange={(e) => setF({ ...f, category_id: e.target.value || null })} className="w-full bg-transparent border border-border px-3 py-2">
                <option value="">—</option>
                {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Brand</div>
              <select value={f.brand_id ?? ""} onChange={(e) => setF({ ...f, brand_id: e.target.value || null })} className="w-full bg-transparent border border-border px-3 py-2">
                <option value="">—</option>
                {brands?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Tags</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {f.tags.map((t: string) => (
                  <span key={t} className="text-xs bg-secondary px-2 py-1 flex items-center gap-1">{t} <button type="button" onClick={() => rmTag(t)}><X size={10} /></button></span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} className="flex-1 bg-transparent border border-border px-3 py-2 text-sm" />
                <button type="button" onClick={addTag} className="border border-border px-3 text-xs">Add</button>
              </div>
            </div>
          </section>

          <section className="border border-border p-6 space-y-3">
            <h3 className="font-serif text-xl">Flags</h3>
            {(["is_featured","is_trending","is_new_arrival","is_best_seller"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} className="accent-primary" />
                {k.replace("is_", "").replace("_", " ")}
              </label>
            ))}
          </section>
        </aside>
      </div>
    </form>
  );
}
