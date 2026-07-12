import { ReactNode } from "react";

export function AdminHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-serif text-primary">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AdminCard({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="border border-border rounded p-5 space-y-4">
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
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</div>
      {children}
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded">{children}</div>;
}
