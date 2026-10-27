import { Button } from "@/components/ui/button";
import type { AuthenticatedUser } from "@/lib/auth-api";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Footer from "./Footer";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { SIDEBAR_GROUPS } from "./navigation";

interface LayoutPrincipalProps {
  user: AuthenticatedUser;
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

  const current = SIDEBAR_GROUPS.map((g) => g.items.find((n) => n.to === location.pathname)?.label).find(Boolean) ?? "Vue d’ensemble";

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
