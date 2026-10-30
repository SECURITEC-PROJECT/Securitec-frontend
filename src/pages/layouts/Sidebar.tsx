import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, LogOut, Search, ShieldCheck } from "lucide-react";
import type { AuthenticatedUser } from "@/lib/auth-api";
import { Link, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import logoSecuritec from "@/assets/logo securitec.jpg";
import { canAccessRoute, SIDEBAR_GROUPS } from "./navigation";

interface SidebarProps {
  open: boolean;
  setOpen: (val: boolean) => void;
  user: AuthenticatedUser | null;
  role: string;
  signOut: () => void;
}

export default function Sidebar({ open, setOpen, user, role, signOut }: SidebarProps) {
  const location = useLocation();
  const [search, setSearch] = useState("");
  const filteredGroups = useMemo(() => {
    const query = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
    return SIDEBAR_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const canAccess = Boolean(user && canAccessRoute(user.role, item.to));
          const searchableText = `${group.title} ${item.label}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
          return canAccess && (!query || searchableText.includes(query));
        }),
      })).filter((group) => group.items.length > 0);
  }, [search, user]);

  return (
    <aside className={`${open ? "fixed inset-y-0 left-0 z-50 flex" : "hidden"} w-64 shrink-0 flex-col border-r bg-sidebar px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen`}>
      <Link to="/dashboard" className="mb-6 flex items-center gap-2.5 px-2 text-sidebar-primary">
        <img src={logoSecuritec} alt="SECURITEC Surveillance" className="h-12 w-11 rounded-md object-contain" />
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

      <div className="relative mb-4">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Rechercher une page dans le menu"
          placeholder="Rechercher une page…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>

      <nav aria-label="Navigation principale" className="flex-1 space-y-5 overflow-y-auto">
        {filteredGroups.map((g) => (
          <div key={g.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold text-muted-foreground">{g.title}</p>
            <div className="space-y-0.5">
              {g.items.map((n) => {
                const isActive = location.pathname === n.to;
                const Icon = n.icon;
                return (
                  <Link 
                    key={n.to} 
                    to={n.to} 
                    onClick={() => setOpen(false)} 
                    className={`flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-[13px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent ${
                      isActive ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : ""
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{n.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted-foreground">Aucune page trouvée.</p>
        )}
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
