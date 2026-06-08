import type { ReactNode } from "react";

interface PanelProps {
  title?: string;
  icon?: ReactNode;
  badge?: { label: string; tone: "green" | "orange" | "red" | "blue" };
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Panel({ title, icon, badge, action, children, className = "" }: PanelProps) {
  return (
    <section className={`card ${className}`}>
      {(title || icon || badge || action) && (
        <header className="card-head">
          {icon}
          {title && <h3 className="card-title">{title}</h3>}
          {badge && <span className={`card-badge cb-${badge.tone}`}>{badge.label}</span>}
          {action && <div style={{ marginLeft: badge ? 8 : "auto" }}>{action}</div>}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}
