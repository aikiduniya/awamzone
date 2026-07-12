import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, X } from "lucide-react";
import { AdminHeader, Empty } from "./admin-ui";
import { PaginationBar } from "./pagination-bar";

export type CrudField = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "checkbox" | "select" | "datetime" | "tags" | "url";
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  colSpan?: 1 | 2;
};

type Column = {
  key: string;
  label: string;
  render?: (row: any) => ReactNode;
  sortable?: boolean;
};

type Props = {
  table: string;
  title: string;
  description?: string;
  fields: CrudField[];
  columns: Column[];
  orderBy?: { column: string; ascending?: boolean };
  defaults?: Record<string, any>;
  transform?: (v: any) => any;
  searchColumns?: string[]; // columns to search (ilike). Defaults to ['name','title','email']
  pageSizeDefault?: number;
};

function slugify(s: string) { return String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export function SimpleCrud({ table, title, description, fields, columns, orderBy, defaults = {}, transform, searchColumns, pageSizeDefault = 25 }: Props) {
  const defaultSort = orderBy?.column ?? "created_at";
  const defaultAsc = orderBy?.ascending ?? false;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeDefault);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sortCol, setSortCol] = useState(defaultSort);
  const [sortAsc, setSortAsc] = useState(defaultAsc);
  const [editing, setEditing] = useState<any>(null);

  // debounce search
  useMemo(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const searchCols = searchColumns ?? ["name", "title", "email", "slug"];

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["crud", table, page, pageSize, debouncedQ, sortCol, sortAsc],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query: any = supabase.from(table as any).select("*", { count: "exact" }).order(sortCol, { ascending: sortAsc });
      if (debouncedQ) {
        // Filter using OR ilike across allowed columns present in the fields list
        const usable = searchCols.filter((c) => fields.some((f) => f.key === c) || c === "name" || c === "title" || c === "email" || c === "slug");
        if (usable.length) {
          const clause = usable.map((c) => `${c}.ilike.%${debouncedQ}%`).join(",");
          query = query.or(clause);
        }
      }
      query = query.range(from, to);
      const { data: rows, count, error } = await query;
      if (error) {
        // Fallback if any search column doesn't exist on the table
        const { data: fallback, count: fallbackCount } = await supabase.from(table as any).select("*", { count: "exact" }).order(sortCol, { ascending: sortAsc }).range(from, to);
        return { rows: fallback ?? [], count: fallbackCount ?? 0 };
      }
      return { rows: rows ?? [], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;

  const blank = () => {
    const o: any = { ...defaults };
    fields.forEach((f) => {
      if (o[f.key] === undefined) {
        o[f.key] = f.type === "checkbox" ? false : f.type === "number" ? 0 : f.type === "tags" ? [] : "";
      }
    });
    return o;
  };

  const save = async () => {
    if (!editing) return;
    let payload: any = { ...editing };
    if ("slug" in payload && "name" in payload && !payload.slug) payload.slug = slugify(payload.name);
    if ("slug" in payload && "title" in payload && !payload.slug) payload.slug = slugify(payload.title);
    fields.forEach((f) => {
      if (f.type === "datetime" && payload[f.key] === "") payload[f.key] = null;
      if (f.type === "number") payload[f.key] = Number(payload[f.key]) || 0;
    });
    if (transform) payload = transform(payload);
    const { id, created_at, updated_at, ...rest } = payload;
    if (id) {
      const { error } = await (supabase.from(table as any) as any).update(rest).eq("id", id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await (supabase.from(table as any) as any).insert(rest);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved"); setEditing(null); refetch();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await (supabase.from(table as any) as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); refetch();
  };

  const toggleSort = (key: string) => {
    if (sortCol === key) setSortAsc((v) => !v);
    else { setSortCol(key); setSortAsc(true); }
    setPage(1);
  };

  return (
    <>
      <AdminHeader title={title} description={description} actions={
        <button onClick={() => setEditing(blank())} className="inline-flex items-center gap-2 border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]"><Plus size={14} /> New</button>
      } />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 border border-border rounded px-3 py-2 flex-1 max-w-md">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}…`}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground" aria-label="Clear">
              <X size={12} />
            </button>
          )}
        </div>
        {isFetching && <span className="text-xs text-muted-foreground">Loading…</span>}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 && !debouncedQ ? (
        <Empty>No records yet</Empty>
      ) : (
        <div className="border border-border rounded">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr className="text-left">
                  {columns.map((c) => {
                    const canSort = c.sortable !== false && !c.render;
                    const active = sortCol === c.key;
                    return (
                      <th key={c.key} className="p-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {canSort ? (
                          <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                            {c.label}
                            {active ? (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-40" />}
                          </button>
                        ) : c.label}
                      </th>
                    );
                  })}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={columns.length + 1} className="p-6 text-center text-muted-foreground">No results for “{debouncedQ}”.</td></tr>
                ) : rows.map((row: any) => (
                  <tr key={row.id} className="border-t border-border hover:bg-secondary/40">
                    {columns.map((c) => <td key={c.key} className="p-3 align-top">{c.render ? c.render(row) : String(row[c.key] ?? "—")}</td>)}
                    <td className="p-3 text-right whitespace-nowrap">
                      <button onClick={() => setEditing({ ...row })} className="text-primary text-xs uppercase tracking-[0.2em] mr-3">Edit</button>
                      <button onClick={() => remove(row.id)} className="text-destructive text-xs uppercase tracking-[0.2em]">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div className="bg-surface border border-border w-full max-w-2xl max-h-[90vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="font-serif text-2xl">{editing.id ? "Edit" : "New"} {title}</h3><button onClick={() => setEditing(null)}><X /></button></div>
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key} className={f.colSpan === 2 || ["textarea"].includes(f.type ?? "text") ? "col-span-2" : "col-span-2 md:col-span-1"}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{f.label}</div>
                  {f.type === "textarea" ? (
                    <textarea rows={4} value={editing[f.key] ?? ""} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
                  ) : f.type === "checkbox" ? (
                    <label className="flex items-center gap-2 h-10"><input type="checkbox" checked={!!editing[f.key]} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })} className="accent-primary" /> Enabled</label>
                  ) : f.type === "select" ? (
                    <select value={editing[f.key] ?? ""} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} className="w-full bg-transparent border border-border px-3 py-2 text-sm">
                      <option value="">—</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === "tags" ? (
                    <input value={(editing[f.key] ?? []).join(", ")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="comma,separated" className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
                  ) : (
                    <input type={f.type === "number" ? "number" : f.type === "datetime" ? "datetime-local" : "text"}
                      value={editing[f.key] ?? ""} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
                  )}
                  {f.hint && <div className="text-[10px] text-muted-foreground mt-1">{f.hint}</div>}
                </div>
              ))}
            </div>
            <button onClick={save} className="mt-6 w-full border border-primary bg-primary text-primary-foreground py-3 text-xs uppercase tracking-[0.24em]">Save</button>
          </div>
        </div>
      )}
    </>
  );
}
