import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Footer from "./Footer";
import Header from "./Header";
import Sidebar from "./Sidebar";

// Groupes de navigation pour retrouver le libellé de la page active
const groups = [
  { title: "PILOTAGE", items: [{ to: "/dashboard", label: "Vue d’ensemble" }, { to: "/dashboard/statistiques", label: "Statistiques" }] },
  { title: "POSTE DE GARDE", items: [{ to: "/dashboard/prise-de-poste", label: "Prise de poste" }, { to: "/dashboard/passation", label: "Passation" }, { to: "/dashboard/visiteurs", label: "Entrées / sorties" }, { to: "/dashboard/controle-acces", label: "Contrôle d’accès" }, { to: "/dashboard/rondes", label: "Rondes" }, { to: "/dashboard/cameras", label: "Caméras" }, { to: "/dashboard/main-courante", label: "Main courante" }] },
  { title: "ÉQUIPE & DOCUMENTS", items: [{ to: "/dashboard/employes", label: "Employés" }, { to: "/dashboard/comptes-rendus", label: "Comptes rendus" }, { to: "/dashboard/messagerie", label: "Messagerie" }, { to: "/dashboard/documents", label: "Documents" }, { to: "/dashboard/administration", label: "Administration" }] },
] as const;

interface LayoutPrincipalProps {
  user: any;
  onLogout: () => void;
}

export default function LayoutPrincipal({ user, onLogout }: LayoutPrincipalProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const role = user?.label || 'Agent Principal';

  const signOut = () => {
    onLogout();
    navigate('/login', { replace: true });
  };

  const current = groups.map((g) => g.items.find((n) => n.to === location.pathname)?.label).find(Boolean) ?? "Vue d’ensemble";

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar 
        open={open} 
        setOpen={setOpen} 
        user={user} 
        role={role} 
        signOut={signOut} 
      />

      {open && <Button aria-label="Fermer le menu" variant="ghost" className="fixed inset-0 z-40 h-screen w-screen rounded-none bg-foreground/20 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="min-w-0 flex-1">
        <Header 
          open={open} 
          setOpen={setOpen} 
          current={current} 
          role={role} 
          signOut={signOut} 
        />

        <main className="mx-auto max-w-[1600px] p-5 lg:p-8">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
