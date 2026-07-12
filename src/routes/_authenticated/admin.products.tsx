import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PaginationBar } from "@/components/admin/pagination-bar";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsList,
});

function ProductsList() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortCol, setSortCol] = useState<string>("created_at");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: cats } = useQuery({
    queryKey: ["filter-cats"],
    queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [],
  });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-products", page, pageSize, debouncedQ, sortCol, sortAsc, status, categoryId],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from("products")
        .select("id,name,slug,sku,price,sale_price,stock,status,images,categories(name),brands(name)", { count: "exact" })
        .order(sortCol, { ascending: sortAsc })
        .range(from, to);
      if (debouncedQ) query = query.or(`name.ilike.%${debouncedQ}%,sku.ilike.%${debouncedQ}%,slug.ilike.%${debouncedQ}%`);
      if (status) query = query.eq("status", status as any);
      if (categoryId) query = query.eq("category_id", categoryId);
      const { data: rows, count } = await query;
      return { rows: rows ?? [], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;

  const remove = async (id: string) => {
    if (!confirm("Delete product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); refetch(); }
  };

  const toggleSort = (key: string) => {
    if (sortCol === key) setSortAsc((v) => !v);
    else { setSortCol(key); setSortAsc(true); }
    setPage(1);
  };

  const th = (label: string, key: string) => {
    const active = sortCol === key;
    return (
      <th className="p-4">
        <button onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 eyebrow hover:text-foreground">
          {label}
          {active ? (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-40" />}
        </button>
      </th>
    );
  };

  return (
    <>
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="eyebrow mb-2">Catalog</div>
          <h1 className="text-4xl font-serif">Products</h1>
        </div>
        <Link to="/admin/products/$id" params={{ id: "new" }} className="inline-flex items-center gap-2 border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]">
          <Plus size={14} /> New Product
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 border border-border rounded px-3 py-2 flex-1 max-w-md">
          <Search size={14} className="text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU, slug…" className="flex-1 bg-transparent text-sm focus:outline-none" />
          {q && <button onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>}
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-10 rounded border border-border bg-transparent px-3 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="h-10 rounded border border-border bg-transparent px-3 text-sm">
          <option value="">All categories</option>
          {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {isFetching && <span className="text-xs text-muted-foreground">Loading…</span>}
      </div>

      <div className="border border-border rounded">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr className="text-left">
                {th("Product", "name")}
                {th("SKU", "sku")}
                <th className="p-4 eyebrow">Category</th>
                {th("Price", "price")}
                {th("Stock", "stock")}
                {th("Status", "status")}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length ? rows.map((p: any) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={p.images?.[0]} alt="" className="w-10 h-12 object-cover bg-surface" />
                      <div>
                        <div className="font-serif">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.brands?.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground font-mono text-xs">{p.sku}</td>
                  <td className="p-4 text-muted-foreground">{p.categories?.name}</td>
                  <td className="p-4 text-right">{formatMoney(p.sale_price ?? p.price)}</td>
                  <td className="p-4 text-right">{p.stock}</td>
                  <td className="p-4 text-xs uppercase tracking-[0.2em]">{p.status}</td>
                  <td className="p-4 text-right space-x-3 whitespace-nowrap">
                    <Link to="/admin/products/$id" params={{ id: p.id }} className="text-primary text-xs uppercase tracking-[0.2em]">Edit</Link>
                    <button onClick={() => remove(p.id)} className="text-destructive text-xs uppercase tracking-[0.2em]">Delete</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No products match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      </div>
    </>
  );
}
