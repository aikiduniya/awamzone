import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader, Field, Empty } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/shipping")({ component: ShippingAdmin });

function ShippingAdmin() {
  const qc = useQueryClient();
  const [zoneOpen, setZoneOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [zone, setZone] = useState<any>(null);
  const [rate, setRate] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: zones } = useQuery({
    queryKey: ["admin-zones"],
    queryFn: async () => (await supabase.from("shipping_zones").select("*").order("sort_order")).data ?? [],
  });
  const { data: rates } = useQuery({
    queryKey: ["admin-rates"],
    queryFn: async () => (await supabase.from("shipping_rates").select("*").order("sort_order")).data ?? [],
  });

  const saveZone = async () => {
    const payload = { ...zone, countries: (typeof zone.countries === "string" ? zone.countries.split(",") : zone.countries).map((c: string) => c.trim().toUpperCase()).filter(Boolean) };
    delete payload.created_at; delete payload.updated_at;
    const { error } = zone.id
      ? await supabase.from("shipping_zones").update(payload).eq("id", zone.id)
      : await supabase.from("shipping_zones").insert(payload);
    if (error) return toast.error(error.message);
    setZoneOpen(false); qc.invalidateQueries({ queryKey: ["admin-zones"] });
  };
  const saveRate = async () => {
    const payload = {
      ...rate,
      cost: Number(rate.cost) || 0,
      per_kg: rate.per_kg ? Number(rate.per_kg) : null,
      min_order_total: rate.min_order_total ? Number(rate.min_order_total) : null,
      max_order_total: rate.max_order_total ? Number(rate.max_order_total) : null,
      free_over: rate.free_over ? Number(rate.free_over) : null,
    };
    delete payload.created_at;
    const { error } = rate.id
      ? await supabase.from("shipping_rates").update(payload).eq("id", rate.id)
      : await supabase.from("shipping_rates").insert(payload);
    if (error) return toast.error(error.message);
    setRateOpen(false); qc.invalidateQueries({ queryKey: ["admin-rates"] });
  };
  const delZone = async (id: string) => { if (confirm("Delete zone and its rates?")) { await supabase.from("shipping_zones").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-zones"] }); qc.invalidateQueries({ queryKey: ["admin-rates"] }); } };
  const delRate = async (id: string) => { if (confirm("Delete rate?")) { await supabase.from("shipping_rates").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-rates"] }); } };

  return (
    <div>
      <AdminHeader title="Shipping Zones & Rates" description="Group countries into zones, then add flat, weight-based or price-tier rates." actions={
        <Button onClick={() => { setZone({ name: "", countries: [], is_active: true, sort_order: 0 }); setZoneOpen(true); }}><Plus size={14} className="mr-1" /> New zone</Button>
      } />

      {!zones?.length ? <Empty>No shipping zones yet.</Empty> : (
        <div className="space-y-3">
          {zones.map((z: any) => (
            <div key={z.id} className="border border-border rounded">
              <div className="flex items-center justify-between p-4">
                <button onClick={() => setExpanded({ ...expanded, [z.id]: !expanded[z.id] })} className="flex items-center gap-2 text-left">
                  {expanded[z.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="font-medium">{z.name}</span>
                  <span className="text-xs text-muted-foreground">{z.countries.join(", ")}</span>
                </button>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setRate({ zone_id: z.id, name: "", method_type: "flat", cost: 0, is_active: true, sort_order: 0 }); setRateOpen(true); }}><Plus size={14} className="mr-1" />Rate</Button>
                  <Button size="icon" variant="ghost" onClick={() => { setZone({ ...z, countries: z.countries.join(", ") }); setZoneOpen(true); }}><Edit size={14} /></Button>
                  <Button size="icon" variant="ghost" onClick={() => delZone(z.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
              {expanded[z.id] && (
                <div className="border-t border-border">
                  {rates?.filter((r: any) => r.zone_id === z.id).length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">No rates in this zone yet.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="text-left p-3">Name</th>
                          <th className="text-left p-3">Method</th>
                          <th className="text-right p-3">Base</th>
                          <th className="text-right p-3">Per kg</th>
                          <th className="text-right p-3">Free over</th>
                          <th className="text-left p-3">ETA</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rates?.filter((r: any) => r.zone_id === z.id).map((r: any) => (
                          <tr key={r.id} className="border-t border-border">
                            <td className="p-3">{r.name}</td>
                            <td className="p-3 text-muted-foreground">{r.method_type}</td>
                            <td className="p-3 text-right">{r.cost}</td>
                            <td className="p-3 text-right">{r.per_kg ?? "—"}</td>
                            <td className="p-3 text-right">{r.free_over ?? "—"}</td>
                            <td className="p-3 text-muted-foreground">{r.estimated_days ?? "—"}</td>
                            <td className="p-3 text-right">
                              <Button size="icon" variant="ghost" onClick={() => { setRate(r); setRateOpen(true); }}><Edit size={14} /></Button>
                              <Button size="icon" variant="ghost" onClick={() => delRate(r.id)}><Trash2 size={14} /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Zone dialog */}
      <Dialog open={zoneOpen} onOpenChange={setZoneOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{zone?.id ? "Edit zone" : "New zone"}</DialogTitle></DialogHeader>
          {zone && (
            <div className="space-y-4">
              <Field label="Name"><Input value={zone.name} onChange={(e) => setZone({ ...zone, name: e.target.value })} /></Field>
              <Field label="Countries (ISO codes, comma separated)" hint='Use * for "rest of world".'><Input value={zone.countries} onChange={(e) => setZone({ ...zone, countries: e.target.value })} placeholder="US, CA, GB" /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={zone.is_active} onChange={(e) => setZone({ ...zone, is_active: e.target.checked })} className="accent-primary" />Active</label>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setZoneOpen(false)}>Cancel</Button><Button onClick={saveZone}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rate dialog */}
      <Dialog open={rateOpen} onOpenChange={setRateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{rate?.id ? "Edit rate" : "New rate"}</DialogTitle></DialogHeader>
          {rate && (
            <div className="space-y-4">
              <Field label="Name"><Input value={rate.name} onChange={(e) => setRate({ ...rate, name: e.target.value })} placeholder="Standard shipping" /></Field>
              <Field label="Description"><Input value={rate.description ?? ""} onChange={(e) => setRate({ ...rate, description: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Method">
                  <select value={rate.method_type} onChange={(e) => setRate({ ...rate, method_type: e.target.value })} className="w-full h-9 border border-input bg-background rounded-md px-2 text-sm">
                    <option value="flat">Flat rate</option><option value="per_weight">Per weight</option><option value="price_tier">Price tier</option>
                  </select>
                </Field>
                <Field label="Estimated days"><Input value={rate.estimated_days ?? ""} onChange={(e) => setRate({ ...rate, estimated_days: e.target.value })} placeholder="3–5" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Base cost"><Input type="number" step="0.01" value={rate.cost} onChange={(e) => setRate({ ...rate, cost: e.target.value })} /></Field>
                <Field label="Per kg (optional)"><Input type="number" step="0.01" value={rate.per_kg ?? ""} onChange={(e) => setRate({ ...rate, per_kg: e.target.value })} /></Field>
                <Field label="Free over"><Input type="number" step="0.01" value={rate.free_over ?? ""} onChange={(e) => setRate({ ...rate, free_over: e.target.value })} /></Field>
                <Field label="Min order total"><Input type="number" step="0.01" value={rate.min_order_total ?? ""} onChange={(e) => setRate({ ...rate, min_order_total: e.target.value })} /></Field>
                <Field label="Max order total"><Input type="number" step="0.01" value={rate.max_order_total ?? ""} onChange={(e) => setRate({ ...rate, max_order_total: e.target.value })} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rate.is_active} onChange={(e) => setRate({ ...rate, is_active: e.target.checked })} className="accent-primary" />Active</label>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setRateOpen(false)}>Cancel</Button><Button onClick={saveRate}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
