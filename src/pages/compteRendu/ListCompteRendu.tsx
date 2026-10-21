import { Empty, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Download, Pencil } from "lucide-react";
import { useState } from "react";
import { serviceApi } from "@/lib/service-api";
import { toast } from "sonner";

export default function ListCompteRendu({ data, onEdit }: { data: any[]; onEdit?: (report: any) => void }) {
  const [audit, setAudit] = useState<Record<string, any[]>>({});
  const [auditOpen, setAuditOpen] = useState<string | null>(null);
  const toggleAudit = async (id: string) => {
    if (auditOpen === id) { setAuditOpen(null); return; }
    try {
      if (!audit[id]) {
        const entries = await serviceApi.reportAudit(id);
        setAudit((previous) => ({ ...previous, [id]: entries }));
      }
      setAuditOpen(id);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Historique indisponible"); }
  };

  return <Panel title="Comptes rendus enregistrés dans PostgreSQL">
    {data.length ? <ul className="space-y-3">
      {data.map((report) => <li key={report.id} className="rounded-md border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">{report.siteName} · {String(report.reportDate).slice(0, 10)}</p><p className="text-xs text-muted-foreground">{report.providerName} · {report.statut}</p></div><div className="flex gap-2">{onEdit && <Button type="button" variant="outline" size="sm" onClick={() => onEdit(report)} disabled={report.statut === "ENVOYE"}><Pencil className="mr-1 h-4 w-4" />Modifier</Button>}<Button type="button" variant="outline" size="sm" onClick={() => void toggleAudit(report.id)}>Historique audit</Button><Button type="button" variant="outline" size="sm" onClick={() => window.print()}><Download className="mr-1 h-4 w-4" />Imprimer / PDF</Button></div></div>
        {report.statut === "ENVOYE" && <p className="mt-2 text-xs text-muted-foreground">Envoyé · verrouillé pour audit</p>}
        <details className="mt-3 text-sm"><summary className="cursor-pointer">Afficher les données du rapport</summary><div className="mt-3 space-y-2"><p><strong>Agents :</strong> {(report.agents || []).map((agent: any) => `${agent.name} (${agent.matricule}, ${agent.shift}, ${agent.post})`).join(" · ") || "—"}</p><p><strong>Service :</strong> {String(report.startTime).slice(0, 5)}–{String(report.endTime).slice(0, 5)} · Poste {report.postName}</p><p><strong>Observations :</strong> {report.observations || "—"}</p><pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">{JSON.stringify(report.details, null, 2)}</pre></div></details>
        {auditOpen === report.id && <div className="mt-3 space-y-2 rounded bg-muted p-3 text-xs"><h3 className="font-semibold">Journal de modification</h3>{(audit[report.id] || []).map((entry) => <div key={entry.id} className="border-b pb-2"><p className="font-medium">{entry.action} · {entry.actorName} · {new Date(entry.createdAt).toLocaleString()}</p><details><summary className="cursor-pointer">Données enregistrées</summary><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap">{JSON.stringify(entry.apres, null, 2)}</pre></details></div>)}</div>}
      </li>)}
    </ul> : <Empty text="Aucun compte rendu dans la base" />}
  </Panel>;
}
