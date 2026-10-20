import { PageHeader, Panel } from "@/components/PageHeader";
import { serviceApi } from "@/lib/service-api";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import FormCompteRendu from "./FormCompteRendu";
import ListCompteRendu from "./ListCompteRendu";

export default function ComptesRendus() {
  const [reports, setReports] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => setReports(await serviceApi.listReports()), []);
  useEffect(() => { refresh().catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, [refresh]);

  const saved = (report: any) => {
    setSelected(report);
    setReports((previous) => [report, ...previous.filter((row) => row.id !== report.id)]);
  };

  return <div>
    <PageHeader title="Comptes rendus journaliers" subtitle="Formulaire structuré selon les modèles Excel Usine et Agence, avec brouillon, envoi verrouillé et historique d’audit." action={<Button variant="outline" onClick={() => setSelected(null)}><FilePlus2 className="mr-2 h-4 w-4" />Nouveau rapport</Button>} />
    {error && <Panel title="Connexion backend"><p className="text-sm text-destructive">{error}</p></Panel>}
    {loading ? <Panel title="Chargement"><p className="text-sm text-muted-foreground">Chargement des comptes rendus…</p></Panel> : <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
      <FormCompteRendu existingReport={selected} onSaved={saved} />
      <ListCompteRendu data={reports} onEdit={setSelected} />
    </div>}
  </div>;
}
