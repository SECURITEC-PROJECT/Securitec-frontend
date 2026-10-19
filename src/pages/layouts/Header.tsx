import { Button } from "@/components/ui/button";
import { Bell, ChevronRight, CircleHelp, LogOut, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

interface HeaderProps {
  open: boolean;
  setOpen: (val: boolean) => void;
  current: string;
  role: string;
  signOut: () => void;
}

export default function Header({ open, setOpen, current, role, signOut }: HeaderProps) {
  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-3 lg:px-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </Button>
        <span className="hidden text-xs text-muted-foreground sm:block">Espace de supervision</span>
        <ChevronRight className="hidden h-3 w-3 text-muted-foreground sm:block" />
        <span className="text-xs font-medium">{current}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium">{role}</span>
        <Button variant="ghost" size="icon" title="Se déconnecter" aria-label="Se déconnecter" onClick={signOut}>
          <LogOut />
        </Button>
        <Button asChild variant="ghost" size="icon" title="Consignes à lire">
          <Link to="/dashboard/messagerie"><Bell /></Link>
        </Button>
        <Button asChild variant="ghost" size="icon" title="Documents du site" className="hidden sm:inline-flex">
          <Link to="/dashboard/documents"><CircleHelp /></Link>
        </Button>
      </div>
    </header>
  );
}