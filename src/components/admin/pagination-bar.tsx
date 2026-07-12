// Reusable pagination controls for server-paginated admin tables.
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
  pageSizes?: number[];
}

export function PaginationBar({ page, pageSize, total, onPage, onPageSize, pageSizes = [10, 25, 50, 100] }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const pages: (number | "…")[] = [];
  const push = (v: number | "…") => pages.push(v);
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) push(i);
  } else {
    push(1);
    if (page > 3) push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) push(i);
    if (page < totalPages - 2) push("…");
    push(totalPages);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t border-border text-xs">
      <div className="text-muted-foreground">
        {total === 0 ? "No records" : <>Showing <span className="text-foreground font-medium">{from}–{to}</span> of <span className="text-foreground font-medium">{total.toLocaleString()}</span></>}
      </div>
      <div className="flex items-center gap-1">
        <label className="text-muted-foreground mr-2">
          Rows{" "}
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="ml-1 h-7 rounded border border-border bg-background px-1 text-xs"
          >
            {pageSizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="h-7 w-7 grid place-items-center rounded border border-border hover:bg-secondary disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`h-7 min-w-[28px] px-2 rounded border text-xs ${p === page ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
            >
              {p}
            </button>
          ),
        )}
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="h-7 w-7 grid place-items-center rounded border border-border hover:bg-secondary disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
