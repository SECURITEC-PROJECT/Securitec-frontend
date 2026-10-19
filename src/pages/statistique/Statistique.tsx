import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCsv, useDemoTable } from "@/lib/demo-store";
import { Download } from "lucide-react";
import { useState } from "react";
import ChartStatistique from "./ChartStatistique";
import GridStatistique from "./GridStatistique";

export default function Statistique() {
  const visitors = useDemoTable('visitors'); 
  const vehicles = useDemoTable('vehicles'); 
  const logs = useDemoTable('logbook_entries'); 
  const patrols = useDemoTable('patrols'); 
  const [period, setPeriod] = useState('jour');

  const series = period === 'jour' ? [3, 8, 12, 7, 16, 10, 6, 4] : period === 'semaine' ? [21, 35, 28, 46, 32, 12, 8] : [64, 82, 71, 95];

  return (
    <div>
      <PageHeader 
        title="Statistiques" 
        subtitle="Indicateurs du site · Série graphique fictive" 
        action={
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36" aria-label="Période">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jour">Aujourd’hui</SelectItem>
                <SelectItem value="semaine">Cette semaine</SelectItem>
                <SelectItem value="mois">Ce mois</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => exportCsv('statistiques.csv', [{ visiteurs: visitors.length, vehicules: vehicles.length, evenements: logs.length, rondes: patrols.length }])}>
              <Download /> CSV
            </Button>
          </div>
        } 
      />

      <GridStatistique 
        visitorsCount={visitors.length} 
        vehiclesCount={vehicles.length} 
        logsCount={logs.length} 
        patrolsCount={patrols.length} 
      />

      <ChartStatistique 
        period={period} 
        series={series} 
      />
    </div>
  );
}