import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Copy, Trash2 } from "lucide-react";
import { AdminHeader, Empty, useConfirm, IconButton } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/api-keys")({ component: ApiKeysAdmin });

const SCOPES = ["read:products", "write:products", "read:orders", "write:orders", "read:customers", "write:customers"];

function ApiKeysAdmin() {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { data, refetch } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => (await supabase.from("api_keys").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ raw: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", scopes: [] as string[] });

  const revoke = (k: any) => confirm({
    title: "Revoke this API key?",
    description: `“${k.name}” will stop working immediately.`,
    confirmLabel: "Revoke",
    destructive: true,
    onConfirm: async () => {
      await supabase.from("api_keys").delete().eq("id", k.id);
      refetch();
      toast.success("Revoked");
    },
  });

  const generate = async () => {
    if (!form.name) return toast.error("Name is required");
    const raw = "sk_live_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const prefix = raw.slice(0, 12);
    const enc = new TextEncoder().encode(raw);
    const hashBuf = await crypto.subtle.digest("SHA-256", enc);
    const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("api_keys").insert({ name: form.name, key_prefix: prefix, key_hash: hash, scopes: form.scopes });
    if (error) return toast.error(error.message);
    setNewKey({ raw, name: form.name }); setCreating(false); setForm({ name: "", scopes: [] }); refetch();
  };

  return (
    <>
      {confirmDialog}
      <AdminHeader title="API Keys" description="Grant programmatic access to your storefront and admin APIs." actions={
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]"><Plus size={14} /> New Key</button>
      } />
      {!data?.length ? <Empty>No API keys yet.</Empty> : (
        <div className="border border-border rounded bg-background">
          <table className="w-full text-sm">
            <thead className="bg-secondary sticky top-0 z-10"><tr className="text-left"><th className="p-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Name</th><th className="p-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Prefix</th><th className="p-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Scopes</th><th className="p-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Last used</th><th className="p-3 sticky right-0 bg-secondary" /></tr></thead>
            <tbody>
              {data.map((k) => (
                <tr key={k.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="p-3">{k.name}</td>
                  <td className="p-3 font-mono text-xs">{k.key_prefix}…</td>
                  <td className="p-3 text-xs text-muted-foreground">{(k.scopes || []).join(", ")}</td>
                  <td className="p-3 text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}</td>
                  <td className="p-3 text-right sticky right-0 bg-background">
                    <IconButton label="Revoke key" icon={Trash2} variant="destructive" onClick={() => revoke(k)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setCreating(false)}>
          <div className="bg-background border border-border w-full max-w-lg p-6 rounded shadow-xl animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="font-serif text-2xl">New API Key</h3><button onClick={() => setCreating(false)}><X /></button></div>
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 mb-4" />
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Scopes</div>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {SCOPES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.scopes.includes(s)} onChange={(e) => setForm({ ...form, scopes: e.target.checked ? [...form.scopes, s] : form.scopes.filter((x) => x !== s) })} />
                  {s}
                </label>
              ))}
            </div>
            <button onClick={generate} className="w-full border border-primary bg-primary text-primary-foreground py-3 text-xs uppercase tracking-[0.24em]">Generate</button>
          </div>
        </div>
      )}

      {newKey && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background border border-primary w-full max-w-lg p-6 rounded shadow-xl animate-in zoom-in-95 duration-150">
            <h3 className="font-serif text-2xl mb-2">Your API key</h3>
            <p className="text-sm text-muted-foreground mb-4">Copy this key now. It will not be shown again.</p>
            <div className="bg-background border border-border p-3 font-mono text-xs break-all mb-4">{newKey.raw}</div>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(newKey.raw); toast.success("Copied"); }} className="flex-1 border border-border py-2 text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2"><Copy size={14} /> Copy</button>
              <button onClick={() => setNewKey(null)} className="flex-1 border border-primary bg-primary text-primary-foreground py-2 text-xs uppercase tracking-[0.2em]">Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
