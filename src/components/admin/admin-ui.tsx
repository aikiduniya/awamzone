import { ReactNode, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AdminHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-serif text-primary">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function AdminCard({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="border border-border rounded p-5 space-y-4 bg-background">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</div>
      {children}
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-sm text-muted-foreground py-10 text-center border border-dashed border-border rounded">{children}</div>;
}

export function TableSkeleton({ cols = 4, rows = 6 }: { cols?: number; rows?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function IconButton({
  label, onClick, icon: Icon, variant = "default", disabled, className,
}: {
  label: string;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number }>;
  variant?: "default" | "primary" | "destructive";
  disabled?: boolean;
  className?: string;
}) {
  const variantCls =
    variant === "destructive" ? "hover:bg-destructive/10 hover:text-destructive" :
    variant === "primary" ? "hover:bg-primary/10 hover:text-primary" :
    "hover:bg-secondary hover:text-foreground";
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={cn("h-8 w-8 grid place-items-center rounded text-foreground/80 disabled:opacity-40 disabled:pointer-events-none transition-colors", variantCls, className)}
          >
            <Icon size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{
    title: string;
    description?: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const confirm = (opts: {
    title: string;
    description?: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  }) => setState(opts);

  const dialog = (
    <AlertDialog open={!!state} onOpenChange={(o) => !o && setState(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title ?? "Are you sure?"}</AlertDialogTitle>
          {state?.description && <AlertDialogDescription>{state.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => { await state?.onConfirm(); setState(null); }}
            className={state?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {state?.confirmLabel ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}

/** Consistent modal shell for specialized workflows (order details, key creation, etc.) */
export function AdminModal({
  open, onClose, title, description, size = "lg", children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "md" | "lg" | "xl" | "2xl";
  children: ReactNode;
}) {
  if (!open) return null;
  const widthCls = { md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl", "2xl": "max-w-6xl" }[size];
  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-auto p-4 grid place-items-start md:place-items-center animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn("w-full bg-background border border-border rounded shadow-xl p-6 my-8 animate-in zoom-in-95 duration-150", widthCls)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-serif text-primary">{title}</h2>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded hover:bg-secondary text-foreground/70 hover:text-foreground"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
