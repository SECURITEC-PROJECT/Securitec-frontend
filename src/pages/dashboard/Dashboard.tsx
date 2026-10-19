import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useDemoTable } from "@/lib/demo-store";
import { useProfiles } from "@/lib/security";
import { ArrowRight, Circle, ClipboardCheck, Clock, Plus, Route as RouteIcon, TriangleAlert, Users } from "lucide-react";
import { Link } from "react-router-dom";
import ApercuSite from "./ApercuSite";
import EquipeEnPoste from "./EquipeEnPoste";
import GridStats from "./GridStats";
import MainCouranteRecente from "./MainCouranteRecente";
import RondePerimetrique from "./RondePerimetrique";

export default function Dashboard() {
  const visitors = useDemoTable("visitors"); 
  const shifts = useDemoTable("shifts"); 
  const logs = useDemoTable("logbook_entries"); 
  const vehicles = useDemoTable("vehicles"); 
  const patrols = useDemoTable("patrols"); 
  const name = useProfiles();
  
  const alerts = logs.filter((l) => l.severity !== "normal");

  return (
    <div className="space-y-6">
      <PageHeader title="Vue d’ensemble" subtitle="Jeudi 8 octobre 2026 · Vacation de jour" action={<Button asChild><Link to="/dashboard/main-courante"><Plus /> Nouvel événement</Link></Button>} />
      
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-success">
          <Circle className="h-2 w-2 fill-current" /> Vacation ouverte
        </span>
        <span className="text-muted-foreground">Site pilote · Antsirabe</span>
        <span className="ml-auto flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> Situation de démonstration · 08:45</span>
      </div>

      <GridStats 
        visitorsCount={visitors.filter((v) => !v.exited_at).length} 
        vehiclesCount={vehicles.filter((v) => !v.exited_at).length} 
        shiftsCount={shifts.filter((s) => !s.ended_at).length} 
        alertsCount={alerts.length} 
      />

      <div className="flex flex-wrap items-center gap-3 border-l-4 border-warning bg-warning/10 px-4 py-3">
        <TriangleAlert className="h-5 w-5 shrink-0 text-warning-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Caméra parking · Signal indisponible</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Maintenance informée. Surveillance renforcée sur la zone.</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard/main-courante">Voir l’événement <ArrowRight /></Link>
        </Button>
      </div>

      <div className="grid gap-7 xl:grid-cols-[1.4fr_1fr]">
        <MainCouranteRecente logs={logs} name={name} />

        <div className="space-y-6">
          <EquipeEnPoste shifts={shifts} name={name} />
          <RondePerimetrique patrols={patrols} name={name} />
          <ApercuSite />
        </div>
      </div>

      <section className="border-t pt-5">
        <h2 className="mb-3 text-xs font-semibold text-muted-foreground">ACCÈS RAPIDES</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/dashboard/visiteurs"><Users /> Enregistrer un visiteur</Link></Button>
          <Button asChild variant="outline"><Link to="/dashboard/rondes"><RouteIcon /> Démarrer une ronde</Link></Button>
          <Button asChild variant="outline"><Link to="/dashboard/comptes-rendus"><ClipboardCheck /> Compte rendu de vacation</Link></Button>
        </div>
      </section>
    </div>
  );
}