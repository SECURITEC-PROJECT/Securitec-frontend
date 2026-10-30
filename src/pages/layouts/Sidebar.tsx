import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ContactRound, FileText, Handshake, LogOut, PhoneCall, Search, ShieldCheck, Users } from "lucide-react";
import type { AuthenticatedUser } from "@/lib/auth-api";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import logoSecuritec from "@/assets/logo securitec.jpg";
import { canAccessRoute, homeRouteForRole, SIDEBAR_GROUPS } from "./navigation";
import { serviceApi } from "@/lib/service-api";

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
  const postMatch = location.pathname.match(/^\/dashboard\/postes\/([^/]+)\/?$/);
  const routeContext = location.state as { siteId?: string; posteId?: string; posteNom?: string } | null;
  const savedContext = (() => {
    try {
      return JSON.parse(localStorage.getItem(`securitec-active-post-context:${user?.id || ""}`) || "null") as { siteId?: string; posteId?: string; posteNom?: string } | null;
    } catch { return null; }
  })();
  const isGeneralNavigation = ["/dashboard", "/dashboard/postes"].includes(location.pathname);
  const siteId = routeContext?.siteId || savedContext?.siteId || user?.siteId || "";
  const activePostId = postMatch?.[1] || routeContext?.posteId || (!isGeneralNavigation ? savedContext?.posteId : "") || "";
  const [activePostName, setActivePostName] = useState(routeContext?.posteNom || savedContext?.posteNom || "");
  useEffect(() => {
    if (activePostId && siteId) {
      const nextContext = { siteId, posteId: activePostId, posteNom: routeContext?.posteNom || savedContext?.posteNom || activePostName };
      localStorage.setItem(`securitec-active-post-context:${user?.id || ""}`, JSON.stringify(nextContext));
    }
    setActivePostName(routeContext?.posteNom || savedContext?.posteNom || "");
    if (!activePostId || !siteId || routeContext?.posteNom || savedContext?.posteNom) return;
    let active = true;
    serviceApi.listShiftPosts(siteId).then((posts) => {
      if (active) {
        const posteNom = posts.find((post) => post.id === activePostId)?.nom || "Poste sélectionné";
        setActivePostName(posteNom);
        localStorage.setItem(`securitec-active-post-context:${user?.id || ""}`, JSON.stringify({ siteId, posteId: activePostId, posteNom }));
      }
    }).catch(() => {
      if (active) setActivePostName("Poste sélectionné");
    });
    return () => { active = false; };
  }, [activePostId, activePostName, routeContext?.posteNom, savedContext?.posteNom, siteId, user?.id]);

  const circuitItems = [
    { to: "/dashboard/prise-de-poste", label: "Prise de service", icon: Users },
    { to: "/dashboard/main-courante", label: "Main courante", icon: FileText },
    { to: activePostId ? `/dashboard/postes/${activePostId}#urgences` : "/dashboard/postes", label: "Urgences", icon: PhoneCall },
    { to: "/dashboard/passation", label: "Passation", icon: Handshake },
  ];
  const registerItems = SIDEBAR_GROUPS
    .filter((group) => ["CAHIERS", "FICHES"].includes(group.title))
    .flatMap((group) => group.items)
    .filter((item) => item.to !== "/dashboard/main-courante");
  const providerItems = [
    { to: "/dashboard/prestataires", label: "Fiches prestataires", icon: ContactRound },
    { to: "/dashboard/chauffeurs", label: "Chauffeurs", icon: Users },
    { to: "/dashboard/visiteurs", label: "Visiteurs et accès", icon: ShieldCheck },
    { to: "/dashboard/materiels-sous-traitant", label: "Matériels sous-traitants", icon: ContactRound },
  ];
  const filteredGroups = useMemo(() => {
    const query = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
    if (activePostId) {
      const sections = [
        { title: "POSTE", items: circuitItems.filter((item) => item.label === "Prise de service") },
        { title: "URGENCES", items: circuitItems.filter((item) => item.label === "Urgences") },
        { title: "MAIN COURANTE", items: circuitItems.filter((item) => item.label === "Main courante") },
        { title: "CAHIERS D’ENREGISTREMENT", items: registerItems },
        { title: "PRESTATAIRES & SOUS-TRAITANTS", items: providerItems },
        { title: "PASSATION", items: circuitItems.filter((item) => item.label === "Passation") },
      ];
      return sections.map((section) => ({
        ...section,
        items: section.items.filter((item) => canAccessRoute(user?.role ?? 0, item.to)
          && (!query || `${section.title} ${item.label}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().includes(query))),
      })).filter((section) => section.items.length > 0);
    }
    return SIDEBAR_GROUPS
      .filter((group) => !["CAHIERS", "FICHES"].includes(group.title))
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const canAccess = Boolean(user && canAccessRoute(user.role, item.to));
          const searchableText = `${group.title} ${item.label}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
          return canAccess && (!query || searchableText.includes(query));
        }),
      })).filter((group) => group.items.length > 0);
  }, [search, user, activePostId, circuitItems, registerItems, providerItems]);

  return (
    <aside className={`${open ? "fixed inset-y-0 left-0 z-50 flex" : "hidden"} w-64 shrink-0 flex-col border-r bg-sidebar px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen`}>
      <Link to={homeRouteForRole(user?.role ?? 0)} className="mb-6 flex items-center gap-2.5 px-2 text-sidebar-primary">
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
          <p className="text-xs font-semibold">{user?.siteNom || "Site non associé"}</p>
          <p className="text-[10px] text-muted-foreground">{activePostId ? activePostName : role}</p>
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
        {activePostId && <Link to="/dashboard/postes" onClick={() => setOpen(false)} className="mb-3 flex min-h-10 items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium hover:bg-sidebar-accent">← Tableau des postes</Link>}
        {filteredGroups.map((g) => (
          <div key={g.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold text-muted-foreground">{g.title}</p>
            <div className="space-y-0.5">
              {g.items.map((n) => {
                const isActive = location.pathname === n.to.split("#")[0];
                const Icon = n.icon;
                return (
                    <Link
                    key={n.to} 
                    to={n.to} 
                      state={activePostId ? { siteId, posteId: activePostId, posteNom: activePostName } : undefined}
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
