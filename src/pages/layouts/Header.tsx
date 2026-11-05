import ClocheNotifications from "@/components/ClocheNotifications";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, BookText, ChartNoAxesColumn, ClipboardList, CircleHelp, FileText, House, LogOut, Menu, MessageSquare, Shield, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { canAccessRoute } from "./navigation";

interface HeaderProps {
  open: boolean;
  setOpen: (val: boolean) => void;
  current: string;
  role: string;
  userRole: number;
  signOut: () => void;
}

export default function Header({ open, setOpen, current, role, userRole, signOut }: HeaderProps) {
  const location = useLocation();
  const shortcuts = [
    { to: "/dashboard", label: "Accueil", icon: House },
    { to: "/dashboard/statistiques", label: "Statistiques", icon: ChartNoAxesColumn },
    { to: "/dashboard/consigne", label: "Consignes", icon: BookText },
    { to: "/dashboard/mouvements-aps", label: "Cahiers", icon: ClipboardList },
    { to: "/dashboard/controle-acces", label: "Contrôle d’accès", icon: Shield },
    { to: "/dashboard/passation", label: "Passation", icon: ArrowLeftRight },
    { to: "/dashboard/comptes-rendus", label: "Rapports", icon: FileText },
  ];
  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-2 border-b bg-card px-3 py-3 lg:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </Button>
        <nav aria-label="Accès rapide" className="flex items-center gap-1 overflow-x-auto">
          {shortcuts.filter(({ to }) => canAccessRoute(userRole, to)).map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(`${to}/`));
            return <Link key={to} to={to} title={label} aria-label={label} aria-current={active ? "page" : undefined}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? "bg-accent text-primary shadow-[inset_0_-3px_0_var(--primary)]" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Icon className="h-[18px] w-[18px]" />
            </Link>;
          })}
        </nav>
        <span className="hidden border-l pl-3 text-xs font-medium text-muted-foreground xl:block">{current}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1 rounded-sm bg-success px-2 py-1 text-[11px] font-medium text-success-foreground sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-white" />En ligne</span>
        <span className="hidden text-xs font-medium md:block">{role}</span>
        <Button variant="ghost" size="icon" title="Se déconnecter" aria-label="Se déconnecter" onClick={signOut}>
          <LogOut />
        </Button>
        <Button asChild variant="ghost" size="icon" title="Consignes à lire">
          <Link to="/dashboard/messagerie"><MessageSquare /></Link>
        </Button>
        <ClocheNotifications />
        <Button asChild variant="ghost" size="icon" title="Documents du site" className="hidden sm:inline-flex">
          <Link to="/dashboard/documents"><CircleHelp /></Link>
        </Button>
      </div>
    </header>
  );
}
