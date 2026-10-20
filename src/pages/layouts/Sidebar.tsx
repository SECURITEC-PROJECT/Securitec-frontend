import { Button } from "@/components/ui/button";
import { BarChart3, BookOpen, ChevronDown, ClipboardCheck, FileText, LayoutDashboard, LogOut, MessageSquare, Package, Repeat, Route as RouteIcon, ScanLine, Settings2, ShieldCheck, Users, Video } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const groups = [
  { title: "PILOTAGE", items: [{ to: "/dashboard", label: "Vue d’ensemble", icon: LayoutDashboard }, { to: "/dashboard/statistiques", label: "Statistiques", icon: BarChart3 }] },
  { title: "POSTE DE GARDE", items: [{ to: "/dashboard/prise-de-poste", label: "Prise de poste", icon: ClipboardCheck }, { to: "/dashboard/passation", label: "Passation", icon: Repeat }, { to: "/dashboard/visiteurs", label: "Entrées / sorties", icon: Users }, { to: "/dashboard/controle-acces", label: "Contrôle d’accès", icon: ScanLine }, { to: "/dashboard/rondes", label: "Rondes", icon: RouteIcon }, { to: "/dashboard/cameras", label: "Caméras", icon: Video }, { to: "/dashboard/main-courante", label: "Main courante", icon: BookOpen }] },
  { title: "ÉQUIPE & DOCUMENTS", items: [{ to: "/dashboard/comptes-rendus", label: "Comptes rendus", icon: FileText }, { to: "/dashboard/messagerie", label: "Messagerie", icon: MessageSquare }, { to: "/dashboard/documents", label: "Documents", icon: BookOpen }, { to: "/dashboard/administration", label: "Administration", icon: Settings2 }] },
  { title: "LOGISTIQUE", items: [{ to: "/dashboard/flux-logistiques", label: "Flux logistiques", icon: Package }] },
] as const;

interface SidebarProps {
  open: boolean;
  setOpen: (val: boolean) => void;
  user: any;
  role: string;
  signOut: () => void;
}

export default function Sidebar({ open, setOpen, user, role, signOut }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className={`${open ? "fixed inset-y-0 left-0 z-50 flex" : "hidden"} w-64 shrink-0 flex-col border-r bg-sidebar px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen`}>
      <Link to="/dashboard" className="mb-6 flex items-center gap-2.5 px-2 text-sidebar-primary">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <div>
          <span className="text-lg font-bold">SECURITEC<span className="text-primary">.</span></span>
          <p className="text-[10px] font-medium text-muted-foreground">GESTION DU POSTE DE GARDE</p>
        </div>
      </Link>

      <div className="mb-5 flex items-center gap-2 rounded-md border bg-background p-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-primary">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold">Site pilote · Antsirabe</p>
          <p className="text-[10px] text-muted-foreground">Poste principal</p>
        </div>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold text-muted-foreground">{g.title}</p>
            <div className="space-y-0.5">
              {g.items.map((n) => {
                const isActive = location.pathname === n.to;
                return (
                  <Link 
                    key={n.to} 
                    to={n.to} 
                    onClick={() => setOpen(false)} 
                    className={`flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-[13px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent ${
                      isActive ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : ""
                    }`}
                  >
                    <n.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{n.label}</span>
                    {n.to === "/dashboard/messagerie" && <span className="rounded bg-primary/10 px-1.5 text-xs text-primary">1</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-5 border-t pt-4">
        <div className="flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
            {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'KB'}
          </span>
          <div>
            <p className="text-xs font-semibold">{user?.name || 'Karim Benali'}</p>
            <p className="text-[11px] text-muted-foreground">{role}</p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto" title="Se déconnecter" aria-label="Se déconnecter" onClick={signOut}>
            <LogOut />
          </Button>
        </div>
      </div>
    </aside>
  );
}
