import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, X, Eye, Pencil, Trash2, Copy,
  RefreshCw, Download, Printer, Columns3, CheckCircle2, XCircle,
} from "lucide-react";
import { AdminHeader, Empty } from "./admin-ui";
import { PaginationBar } from "./pagination-bar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  hideable?: boolean;
};

export type CrudAction = {
  key: string;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  variant?: "default" | "primary" | "destructive";
  show?: (row: any) => boolean;
  onClick: (row: any) => void | Promise<void>;
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
  searchColumns?: string[];
  pageSizeDefault?: number;
  onView?: (row: any) => void;
  enableDuplicate?: boolean;
  enableBulk?: boolean;
  bulkToggleField?: string;
  readOnly?: boolean;
  disableCreate?: boolean;
  disableEdit?: boolean;
  disableDelete?: boolean;
  customActions?: CrudAction[];
  selectQuery?: string;
};

function slugify(s: string) { return String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function toCsv(rows: any[], cols: Column[]) {
  const esc = (v: any) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c.key])).join(",")).join("\n");
  return head + "\n" + body;
}

function download(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printTable(title: string, rows: any[], cols: Column[]) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  const esc = (v: any) => String(v ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
  const th = cols.map((c) => `<th>${esc(c.label)}</th>`).join("");
  const tr = rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c.key])}</td>`).join("")}</tr>`).join("");
  win.document.write(`<!doctype html><html><head><title>${esc(title)}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}
    h1{font-size:20px;margin:0 0 16px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
    th{background:#f5f5f5}
    @media print{@page{margin:16mm}}
    </style></head><body>
    <h1>${esc(title)}</h1><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script>
    </body></html>`);
  win.document.close();
}

export function SimpleCrud({
  table, title, description, fields, columns, orderBy, defaults = {}, transform,
  searchColumns, pageSizeDefault = 25, onView, enableDuplicate = true, enableBulk = true,
  bulkToggleField, readOnly = false, disableCreate = false, disableEdit = false,
  disableDelete = false, customActions, selectQuery,
}: Props) {
  const canCreate = !readOnly && !disableCreate;
  const canEdit = !readOnly && !disableEdit;
  const canDelete = !readOnly && !disableDelete;
  const canDuplicate = !readOnly && enableDuplicate;
  const defaultSort = orderBy?.column ?? "created_at";
  const defaultAsc = orderBy?.ascending ?? false;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeDefault);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sortCol, setSortCol] = useState(defaultSort);
  const [sortAsc, setSortAsc] = useState(defaultAsc);
  const [editing, setEditing] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<any>(null);
  const [pendingBulk, setPendingBulk] = useState<"delete" | "enable" | "disable" | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const searchCols = searchColumns ?? ["name", "title", "email", "slug"];

  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ["crud", table, page, pageSize, debouncedQ, sortCol, sortAsc],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query: any = supabase.from(table as any).select(selectQuery ?? "*", { count: "exact" }).order(sortCol, { ascending: sortAsc });
      if (debouncedQ) {
        const usable = searchCols.filter((c) => fields.some((f) => f.key === c) || ["name", "title", "email", "slug"].includes(c));
        if (usable.length) {
          const clause = usable.map((c) => `${c}.ilike.%${debouncedQ}%`).join(",");
          query = query.or(clause);
        }
      }
      query = query.range(from, to);
      const { data: rows, count, error } = await query;
      if (error) {
        const { data: fallback, count: fallbackCount } = await supabase.from(table as any).select(selectQuery ?? "*", { count: "exact" }).order(sortCol, { ascending: sortAsc }).range(from, to);
        return { rows: fallback ?? [], count: fallbackCount ?? 0 };
      }
      return { rows: rows ?? [], count: count ?? 0 };
    },
  });

  const rows: any[] = data?.rows ?? [];
  const total = data?.count ?? 0;
  const visibleCols = useMemo(() => columns.filter((c) => !hidden.has(c.key)), [columns, hidden]);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = rows.some((r) => selected.has(r.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) rows.forEach((r) => next.delete(r.id));
    else rows.forEach((r) => next.add(r.id));
    setSelected(next);
  };

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

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
    const { error } = await (supabase.from(table as any) as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); setPendingDelete(null); refetch();
  };

  const duplicateRow = async (row: any) => {
    const { id, created_at, updated_at, ...rest } = row;
    if ("slug" in rest && rest.slug) rest.slug = `${rest.slug}-copy-${Date.now().toString(36).slice(-4)}`;
    if ("name" in rest && rest.name) rest.name = `${rest.name} (Copy)`;
    if ("title" in rest && rest.title) rest.title = `${rest.title} (Copy)`;
    const { error } = await (supabase.from(table as any) as any).insert(rest);
    if (error) return toast.error(error.message);
    toast.success("Duplicated"); refetch();
  };

  const runBulk = async () => {
    const ids = Array.from(selected);
    if (!ids.length || !pendingBulk) return;
    if (pendingBulk === "delete") {
      const { error } = await (supabase.from(table as any) as any).delete().in("id", ids);
      if (error) return toast.error(error.message);
      toast.success(`Deleted ${ids.length}`);
    } else if (bulkToggleField) {
      const value = pendingBulk === "enable";
      const { error } = await (supabase.from(table as any) as any).update({ [bulkToggleField]: value }).in("id", ids);
      if (error) return toast.error(error.message);
      toast.success(`${value ? "Enabled" : "Disabled"} ${ids.length}`);
    }
    setSelected(new Set()); setPendingBulk(null); refetch();
  };

  const toggleSort = (key: string) => {
    if (sortCol === key) setSortAsc((v) => !v);
    else { setSortCol(key); setSortAsc(true); }
    setPage(1);
  };

  const fetchAllForExport = async () => {
    let query: any = supabase.from(table as any).select(selectQuery ?? "*").order(sortCol, { ascending: sortAsc });
    if (debouncedQ) {
      const usable = searchCols.filter((c) => fields.some((f) => f.key === c) || ["name", "title", "email", "slug"].includes(c));
      if (usable.length) query = query.or(usable.map((c) => `${c}.ilike.%${debouncedQ}%`).join(","));
    }
    const { data } = await query.limit(10000);
    return (data as any[]) ?? [];
  };

  const doExport = async (kind: "csv" | "xls" | "print") => {
    const all = await fetchAllForExport();
    const cols = visibleCols;
    if (kind === "csv") download(`${table}.csv`, "text/csv", toCsv(all, cols));
    else if (kind === "xls") {
      const esc = (v: any) => String(v ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
      const html = `<table border="1"><tr>${cols.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr>${all.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c.key])}</td>`).join("")}</tr>`).join("")}</table>`;
      download(`${table}.xls`, "application/vnd.ms-excel", html);
    } else printTable(title, all, cols);
  };

  const skeletonRows = Array.from({ length: 6 });

  return (
    <TooltipProvider delayDuration={200}>
      <AdminHeader title={title} description={description} actions={
        canCreate ? <button onClick={() => setEditing(blank())} className="inline-flex items-center gap-2 border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]"><Plus size={14} /> New</button> : null
      } />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2 border border-border rounded px-3 py-2 flex-1 min-w-[220px] max-w-md bg-background">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}…`}
            className="flex-1 bg-transparent text-sm focus:outline-none"
            aria-label="Search"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => refetch()} aria-label="Refresh" className="h-9 w-9 grid place-items-center rounded border border-border hover:bg-secondary text-foreground">
                <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger className="h-9 w-9 grid place-items-center rounded border border-border hover:bg-secondary text-foreground" aria-label="Columns">
                  <Columns3 size={14} />
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Columns</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={!hidden.has(c.key)}
                  onCheckedChange={(v) => {
                    const next = new Set(hidden);
                    v ? next.delete(c.key) : next.add(c.key);
                    setHidden(next);
                  }}
                  disabled={c.hideable === false}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger className="h-9 w-9 grid place-items-center rounded border border-border hover:bg-secondary text-foreground" aria-label="Export">
                  <Download size={14} />
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Export</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => doExport("csv")}><Download size={14} className="mr-2" /> Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport("xls")}><Download size={14} className="mr-2" /> Export Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport("print")}><Printer size={14} className="mr-2" /> Print / PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {enableBulk && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 px-3 py-2 rounded border border-primary/40 bg-primary/5">
          <span className="text-xs">{selected.size} selected</span>
          {bulkToggleField && (
            <>
              <button onClick={() => setPendingBulk("enable")} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-secondary"><CheckCircle2 size={12} /> Enable</button>
              <button onClick={() => setPendingBulk("disable")} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-secondary"><XCircle size={12} /> Disable</button>
            </>
          )}
          <button onClick={() => setPendingBulk("delete")} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10"><Trash2 size={12} /> Delete</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      <div className="border border-border rounded bg-background">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="bg-secondary sticky top-0 z-10">
              <tr className="text-left">
                {enableBulk && (
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                )}
                {visibleCols.map((c) => {
                  const canSort = c.sortable !== false && !c.render;
                  const active = sortCol === c.key;
                  return (
                    <th key={c.key} className="p-3 text-xs uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
                      {canSort ? (
                        <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-foreground focus:outline-none focus-visible:text-foreground">
                          {c.label}
                          {active ? (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-40" />}
                        </button>
                      ) : c.label}
                    </th>
                  );
                })}
                <th className="p-3 text-right sticky right-0 bg-secondary" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                skeletonRows.map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    {enableBulk && <td className="p-3"><Skeleton className="h-4 w-4" /></td>}
                    {visibleCols.map((c) => <td key={c.key} className="p-3"><Skeleton className="h-4 w-full max-w-[160px]" /></td>)}
                    <td className="p-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr><td colSpan={visibleCols.length + (enableBulk ? 2 : 1)} className="p-8 text-center text-destructive">
                  Failed to load. <button onClick={() => refetch()} className="underline">Retry</button>
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={visibleCols.length + (enableBulk ? 2 : 1)} className="p-0">
                  <Empty>{debouncedQ ? `No results for “${debouncedQ}”.` : "No records yet"}</Empty>
                </td></tr>
              ) : rows.map((row: any) => (
                <tr key={row.id} className={cn("border-t border-border hover:bg-secondary/40", selected.has(row.id) && "bg-primary/5")}>
                  {enableBulk && (
                    <td className="p-3">
                      <Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleRow(row.id)} aria-label="Select row" />
                    </td>
                  )}
                  {visibleCols.map((c) => <td key={c.key} className="p-3 align-top">{c.render ? c.render(row) : String(row[c.key] ?? "—")}</td>)}
                  <td className="p-3 text-right whitespace-nowrap sticky right-0 bg-background group-hover:bg-secondary/40">
                    <div className="inline-flex items-center gap-1">
                      {onView && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => onView(row)} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary text-foreground/80 hover:text-foreground" aria-label="View">
                              <Eye size={14} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>View</TooltipContent>
                        </Tooltip>
                      )}
                      {canEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => setEditing({ ...row })} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary text-foreground/80 hover:text-primary" aria-label="Edit">
                              <Pencil size={14} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      )}
                      {canDuplicate && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => duplicateRow(row)} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary text-foreground/80 hover:text-foreground" aria-label="Duplicate">
                              <Copy size={14} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Duplicate</TooltipContent>
                        </Tooltip>
                      )}
                      {customActions?.filter((a) => !a.show || a.show(row)).map((a) => {
                        const Icon = a.icon;
                        const variantCls = a.variant === "destructive" ? "hover:bg-destructive/10 hover:text-destructive" : a.variant === "primary" ? "hover:bg-primary/10 hover:text-primary" : "hover:bg-secondary hover:text-foreground";
                        return (
                          <Tooltip key={a.key}>
                            <TooltipTrigger asChild>
                              <button onClick={() => a.onClick(row)} className={cn("h-8 w-8 grid place-items-center rounded text-foreground/80", variantCls)} aria-label={a.label}>
                                {Icon ? <Icon size={14} /> : <span className="text-xs">{a.label.slice(0, 1)}</span>}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{a.label}</TooltipContent>
                          </Tooltip>
                        );
                      })}
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => setPendingDelete(row)} className="h-8 w-8 grid place-items-center rounded hover:bg-destructive/10 text-foreground/80 hover:text-destructive" aria-label="Delete">
                              <Trash2 size={14} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && remove(pendingDelete.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk confirmation */}
      <AlertDialog open={!!pendingBulk} onOpenChange={(o) => !o && setPendingBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBulk === "delete" ? `Delete ${selected.size} records?` :
               pendingBulk === "enable" ? `Enable ${selected.size} records?` :
               `Disable ${selected.size} records?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulk === "delete" ? "This cannot be undone." : "You can change this later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={runBulk}
              className={pendingBulk === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit / create modal */}
      {editing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div className="bg-background border border-border w-full max-w-2xl max-h-[90vh] overflow-auto p-6 rounded shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-2xl">{editing.id ? "Edit" : "New"} {title}</h3>
              <button onClick={() => setEditing(null)} aria-label="Close"><X /></button>
            </div>
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
            <div className="flex gap-2 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 border border-border py-3 text-xs uppercase tracking-[0.24em] hover:bg-secondary">Cancel</button>
              <button onClick={save} className="flex-[2] border border-primary bg-primary text-primary-foreground py-3 text-xs uppercase tracking-[0.24em] hover:opacity-90">Save</button>
            </div>
          </div>
        </div>
      )}

    </TooltipProvider>
  );
}
