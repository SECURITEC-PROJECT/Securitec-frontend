import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold ">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 border-t pt-5">
      {title && <h2 className="mb-4 text-sm font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}
