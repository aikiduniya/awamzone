import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, Empty } from "@/components/admin/admin-ui";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
import { PaginationBar } from "@/components/admin/pagination-bar";

export const Route = createFileRoute("/_authenticated/admin/customers")({ component: CustomersAdmin });

function CustomersAdmin() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortCol, setSortCol] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [banned, setBanned] = useState<string>("");
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: groups } = useQuery({ queryKey: ["cust-groups-mini"], queryFn: async () => (await supabase.from("customer_groups").select("id, name")).data ?? [] });

  const { data, refetch, isLoading, isFetching } = useQuery({
    queryKey: ["admin-customers", page, pageSize, debouncedQ, sortCol, sortAsc, groupId, banned],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from("profiles")
        .select("*, customer_groups(name)", { count: "exact" })
        .order(sortCol, { ascending: sortAsc })
        .range(from, to);
      if (debouncedQ) query = query.or(`full_name.ilike.%${debouncedQ}%,email.ilike.%${debouncedQ}%,phone.ilike.%${debouncedQ}%`);
      if (groupId) query = query.eq("customer_group_id", groupId);
      if (banned === "yes") query = query.eq("is_banned", true);
      if (banned === "no") query = query.eq("is_banned", false);
      const { data: rows, count } = await query;
      return { rows: rows ?? [], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;

  const save = async () => {
    const { error } = await supabase.from("profiles").update({
      customer_group_id: editing.customer_group_id || null,
      admin_notes: editing.admin_notes,
      is_banned: !!editing.is_banned,
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setEditing(null); refetch();
  };

  const toggleSort = (key: string) => {
    if (sortCol === key) setSortAsc((v) => !v);
    else { setSortCol(key); setSortAsc(true); }
    setPage(1);
  };

  const th = (label: string, key: string) => {
    const active = sortCol === key;
    return (
      <th className="p-3">
        <button onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
          {label}
          {active ? (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-40" />}
        </button>
      </th>
    );
  };

  return (
    <>
      <AdminHeader title="Customers" description="Manage customer accounts, groups, and notes." />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 border border-border rounded px-3 py-2 flex-1 max-w-md">
          <Search size={14} className="text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className="flex-1 bg-transparent text-sm focus:outline-none" />
          {q && <button onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>}
        </div>
        <select value={groupId} onChange={(e) => { setGroupId(e.target.value); setPage(1); }} className="h-10 rounded border border-border bg-transparent px-3 text-sm">
          <option value="">All groups</option>
          {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={banned} onChange={(e) => { setBanned(e.target.value); setPage(1); }} className="h-10 rounded border border-border bg-transparent px-3 text-sm">
          <option value="">All</option>
          <option value="no">Active</option>
          <option value="yes">Banned</option>
        </select>
        {isFetching && <span className="text-xs text-muted-foreground">Loading…</span>}
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : rows.length === 0 && !debouncedQ ? <Empty>No customers</Empty> : (
        <div className="border border-border rounded">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr className="text-left">
                  {th("Name", "full_name")}
                  <th className="p-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Group</th>
                  {th("Banned", "is_banned")}
                  {th("Joined", "created_at")}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No customers match your filters.</td></tr>
                ) : rows.map((c: any) => (
                  <tr key={c.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="p-3">{c.full_name || "—"}</td>
                    <td className="p-3">{c.customer_groups?.name || "—"}</td>
                    <td className="p-3">{c.is_banned ? "🚫" : "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-right"><button onClick={() => setEditing({ ...c })} className="text-primary text-xs uppercase tracking-[0.2em]">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div className="bg-surface border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="font-serif text-2xl">{editing.full_name}</h3><button onClick={() => setEditing(null)}><X /></button></div>
            <div className="space-y-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Customer Group</div>
                <select value={editing.customer_group_id || ""} onChange={(e) => setEditing({ ...editing, customer_group_id: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 text-sm">
                  <option value="">— None —</option>
                  {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Admin notes</div>
                <textarea rows={4} value={editing.admin_notes ?? ""} onChange={(e) => setEditing({ ...editing, admin_notes: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.is_banned} onChange={(e) => setEditing({ ...editing, is_banned: e.target.checked })} /> Banned</label>
              <button onClick={save} className="w-full border border-primary bg-primary text-primary-foreground py-3 text-xs uppercase tracking-[0.24em]">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
