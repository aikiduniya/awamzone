import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { MediaPicker } from "./media-picker";

type OptionDef = { name: string; values: string[] };
type Variant = {
  id?: string;
  name: string;
  sku: string | null;
  price: number | null;
  sale_price: number | null;
  stock: number;
  attributes: Record<string, string>;
  image_url: string | null;
  sort_order: number;
};

function cartesian(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>((acc, arr) => acc.flatMap((a) => arr.map((v) => [...a, v])), [[]]);
}

export function ProductVariantsEditor({ productId }: { productId: string }) {
  const [options, setOptions] = useState<OptionDef[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("product_variants").select("*").eq("product_id", productId).order("sort_order");
    const rows = (data ?? []) as any[];
    setVariants(rows.map((r) => ({ ...r, attributes: r.attributes ?? {} })));
    // Reconstruct options from existing variants
    const opts: Record<string, Set<string>> = {};
    rows.forEach((r) => {
      Object.entries(r.attributes ?? {}).forEach(([k, v]) => {
        opts[k] = opts[k] ?? new Set();
        opts[k].add(String(v));
      });
    });
    setOptions(Object.entries(opts).map(([name, set]) => ({ name, values: [...set] })));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [productId]);

  const addOption = () => setOptions([...options, { name: "", values: [] }]);
  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, patch: Partial<OptionDef>) => setOptions(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));

  const generate = () => {
    const valid = options.filter((o) => o.name.trim() && o.values.length > 0);
    if (valid.length === 0) { toast.error("Add at least one option with values"); return; }
    const combos = cartesian(valid.map((o) => o.values));
    const next: Variant[] = combos.map((combo, idx) => {
      const attrs: Record<string, string> = {};
      valid.forEach((o, i) => (attrs[o.name] = combo[i]));
      const existing = variants.find((v) => JSON.stringify(v.attributes) === JSON.stringify(attrs));
      return existing ?? {
        name: combo.join(" / "),
        sku: null, price: null, sale_price: null, stock: 0,
        attributes: attrs, image_url: null, sort_order: idx,
      };
    });
    setVariants(next);
  };

  const updateVariant = (i: number, patch: Partial<Variant>) => setVariants(variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  const removeVariant = (i: number) => setVariants(variants.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      // Delete removed variants
      const existing = await supabase.from("product_variants").select("id").eq("product_id", productId);
      const keptIds = variants.filter((v) => v.id).map((v) => v.id);
      const toDelete = (existing.data ?? []).map((r: any) => r.id).filter((id) => !keptIds.includes(id));
      if (toDelete.length) await supabase.from("product_variants").delete().in("id", toDelete);

      // Upsert
      const payload = variants.map((v, i) => ({
        ...(v.id ? { id: v.id } : {}),
        product_id: productId,
        name: v.name,
        sku: v.sku || null,
        price: v.price ?? null,
        sale_price: v.sale_price ?? null,
        stock: v.stock ?? 0,
        attributes: v.attributes,
        image_url: v.image_url,
        sort_order: i,
      }));
      if (payload.length) {
        const { error } = await supabase.from("product_variants").upsert(payload);
        if (error) throw error;
      }
      toast.success("Variants saved");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="border border-border rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Options</div>
            <div className="text-xs text-muted-foreground">e.g. Size = S, M, L · Color = Red, Blue</div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addOption}><Plus size={14} className="mr-1" />Add option</Button>
        </div>
        {options.map((o, i) => (
          <div key={i} className="flex gap-2 items-start">
            <Input placeholder="Option name (e.g. Size)" value={o.name} onChange={(e) => updateOption(i, { name: e.target.value })} className="w-48" />
            <Input placeholder="Values, comma separated" value={o.values.join(", ")} onChange={(e) => updateOption(i, { values: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(i)}><Trash2 size={14} /></Button>
          </div>
        ))}
        {options.length > 0 && (
          <Button type="button" size="sm" onClick={generate}><Wand2 size={14} className="mr-1" />Generate variants</Button>
        )}
      </div>

      {variants.length > 0 && (
        <div className="border border-border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-2">Image</th>
                <th className="text-left p-2">Variant</th>
                <th className="text-left p-2">SKU</th>
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">Sale</th>
                <th className="text-left p-2">Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-2">
                    {v.image_url ? (
                      <img src={v.image_url} className="w-10 h-10 object-cover rounded" alt="" />
                    ) : (
                      <MediaPicker trigger={<Button type="button" variant="outline" size="sm">Pick</Button>} onPick={(urls) => updateVariant(i, { image_url: urls[0] })} />
                    )}
                    {v.image_url && (
                      <button type="button" onClick={() => updateVariant(i, { image_url: null })} className="text-xs text-muted-foreground hover:text-destructive block mt-1">clear</button>
                    )}
                  </td>
                  <td className="p-2 whitespace-nowrap">{v.name}</td>
                  <td className="p-2"><Input value={v.sku ?? ""} onChange={(e) => updateVariant(i, { sku: e.target.value })} className="w-28" /></td>
                  <td className="p-2"><Input type="number" step="0.01" value={v.price ?? ""} onChange={(e) => updateVariant(i, { price: e.target.value ? Number(e.target.value) : null })} className="w-24" /></td>
                  <td className="p-2"><Input type="number" step="0.01" value={v.sale_price ?? ""} onChange={(e) => updateVariant(i, { sale_price: e.target.value ? Number(e.target.value) : null })} className="w-24" /></td>
                  <td className="p-2"><Input type="number" value={v.stock} onChange={(e) => updateVariant(i, { stock: Number(e.target.value) })} className="w-20" /></td>
                  <td className="p-2"><Button type="button" size="icon" variant="ghost" onClick={() => removeVariant(i)}><Trash2 size={14} /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save variants"}</Button>
    </div>
  );
}
