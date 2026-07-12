import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader, Field, Empty } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/payments")({ component: PaymentsAdmin });

const BLANK = {
  code: "", name: "", description: "", instructions: "",
  provider: "manual", environment: "test",
  config: {} as Record<string, string>,
  supported_currencies: [] as string[],
  icon_url: "", is_active: true, sort_order: 0,
};

const PROVIDERS = [
  { value: "mock_card", label: "Test Card (Mock)", note: "Simulated card checkout for development & QA. Any Luhn-valid number succeeds; 4000000000000002 = declined, 4000000000009995 = insufficient funds. No real charges. Swap for Stripe/PayPal later without changing checkout code." },
  { value: "cod", label: "Cash on Delivery", note: "Customer pays cash on delivery. No API keys needed." },
  { value: "bank_transfer", label: "Bank Transfer", note: "Show your bank details in the instructions box." },
  { value: "stripe", label: "Stripe", note: "Configure once you have a Stripe account. Publishable key goes here; server-side secret is stored as STRIPE_SECRET_KEY backend secret." },
  { value: "paypal", label: "PayPal", note: "PayPal REST checkout (client id / secret stored as backend secrets)." },
  { value: "manual", label: "Manual / Custom", note: "Order marked pending; admin follows up." },
];

function PaymentsAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: rows } = useQuery({ queryKey: ["admin-payments"], queryFn: async () => (await supabase.from("payment_methods").select("*").order("sort_order")).data ?? [] });

  const save = async () => {
    const payload = { ...editing, sort_order: Number(editing.sort_order) || 0 };
    const { error } = editing.id
      ? await supabase.from("payment_methods").update(payload).eq("id", editing.id)
      : await supabase.from("payment_methods").insert(payload);
    if (error) return toast.error(error.message);
    setOpen(false); qc.invalidateQueries({ queryKey: ["admin-payments"] });
  };
  const del = async (id: string) => { if (confirm("Delete?")) { await supabase.from("payment_methods").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-payments"] }); } };

  return (
    <div>
      <AdminHeader title="Payment Methods" description="Enable, configure, and reorder the checkout payment providers." actions={
        <Button onClick={() => { setEditing({ ...BLANK }); setOpen(true); }}><Plus size={14} className="mr-1" /> New method</Button>
      } />
      {!rows?.length ? <Empty>No payment methods yet.</Empty> : (
        <div className="border border-border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Provider</th><th className="text-left p-3">Env</th><th className="text-left p-3">Active</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3 text-muted-foreground">{r.provider}</td>
                  <td className="p-3 text-muted-foreground">{r.environment}</td>
                  <td className="p-3">{r.is_active ? "Yes" : "No"}</td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...r, config: r.config ?? {} }); setOpen(true); }}><Edit size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 size={14} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit method" : "New payment method"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Display name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
                <Field label="Code"><Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toLowerCase() })} placeholder="stripe" /></Field>
              </div>
              <Field label="Provider">
                <select value={editing.provider} onChange={(e) => setEditing({ ...editing, provider: e.target.value })} className="w-full h-9 border border-input bg-background rounded-md px-2 text-sm">
                  {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>
              <div className="text-xs text-muted-foreground bg-secondary/40 p-2 rounded">
                {PROVIDERS.find((p) => p.value === editing.provider)?.note}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Environment">
                  <select value={editing.environment} onChange={(e) => setEditing({ ...editing, environment: e.target.value })} className="w-full h-9 border border-input bg-background rounded-md px-2 text-sm">
                    <option value="test">Test</option><option value="live">Live</option>
                  </select>
                </Field>
                <Field label="Sort order"><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} /></Field>
              </div>
              <Field label="Description"><Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <Field label="Customer instructions" hint="Shown after the customer selects this method (e.g. bank IBAN, wire info).">
                <textarea rows={4} value={editing.instructions ?? ""} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm" />
              </Field>
              {editing.provider === "stripe" && (
                <Field label="Stripe publishable key (safe to store)"><Input value={editing.config?.publishable_key ?? ""} onChange={(e) => setEditing({ ...editing, config: { ...(editing.config ?? {}), publishable_key: e.target.value } })} placeholder="pk_test_…" /></Field>
              )}
              {editing.provider === "paypal" && (
                <Field label="PayPal client ID (publishable)"><Input value={editing.config?.client_id ?? ""} onChange={(e) => setEditing({ ...editing, config: { ...(editing.config ?? {}), client_id: e.target.value } })} /></Field>
              )}
              <Field label="Icon URL (optional)"><Input value={editing.icon_url ?? ""} onChange={(e) => setEditing({ ...editing, icon_url: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="accent-primary" />Active</label>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
