import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import TableauCarteGrise from "./TableauCarteGrise";
import { Download, Printer, Search } from "lucide-react";
import { exportXlsx } from "@/lib/export-xlsx";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const isCarteGriseRecord = (record: { document_type?: string; zone?: string }) =>
  record.document_type === "CIN/Permis" && record.zone === "Contrôle";

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("fr-FR");
};
const formatTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

interface CarteGriseRecord {
  id: string;
  site_id?: string;
  document_type?: string;
  zone?: string;
  full_name?: string;
  entered_at?: string | Date | null;
  id_document?: string;
  vehicle?: string;
  reason?: string;
  equipment?: string;
  site_name?: string;
  exited_at?: string | Date | null;
  exit_notes?: string;
}

export default function CarteGrisePermis() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [records, setRecords] = useState<CarteGriseRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [registryError, setRegistryError] = useState("");
  const [search, setSearch] = useState("");
  const [exitingId, setExitingId] = useState<string | null>(null);
  useEffect(() => {
    serviceApi.listVisitors()
      .then((visitors) => setRecords(visitors.filter(isCarteGriseRecord)))
      .catch((error) => setRegistryError(error instanceof Error ? error.message : "Chargement du registre impossible"))
      .finally(() => setLoadingRecords(false));
  }, []);

  const filteredRecords = records.filter((record) =>
    [
      record.full_name,
      record.id_document,
      record.vehicle,
      record.reason,
      record.equipment,
      record.site_name,
    ].some((value) => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
  );
  const handleExit = async (record: CarteGriseRecord) => {
    if (!window.confirm(`Confirmer la sortie de ${record.full_name || "cette personne"} ? Vérifiez que les documents lui ont été rendus.`)) return;
    setExitingId(record.id);
    setRegistryError("");
    try {
      const result = await serviceApi.exitVisitor(record.id, { equipmentOut: true, extraEquipment: "" }, record.site_id);
      const visitors = await serviceApi.listVisitors();
      setRecords(visitors.filter(isCarteGriseRecord));
      if (result.pendingSync) toast.info("Sortie enregistrée sur cet appareil, en attente de synchronisation.");
      else toast.success("Sortie enregistrée dans l'historique");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Enregistrement de la sortie impossible";
      setRegistryError(message);
      toast.error(message);
    } finally {
      setExitingId(null);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "Registre carte grise et permis";
    window.addEventListener("afterprint", () => {
      document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const handleExport = () => {
    const formatDateTime = (value: string | Date | null | undefined) => {
      if (!value) return "—";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "—";
      return `${formatDate(date)}\n${formatTime(date)}`;
    };
    const rows = filteredRecords.map((record) => {
      return [
        formatDateTime(record.entered_at), formatDateTime(record.exited_at), record.exited_at ? "Sorti" : "Présent",
        record.full_name || "—", record.id_document || "—", record.vehicle || "—", record.reason || "—",
        record.equipment || "—", record.exited_at ? "—" : "Sortie",
      ];
    });
    exportXlsx(`registre-carte-grise-permis-${new Date().toISOString().slice(0,10)}.xlsx`, "Registre contrôles", ["Entrée","Sortie","Statut","Personne","CIN","Immatriculation","Motif","Détails","Action"], rows);
  };

  return (
    <div className="carte-grise-module space-y-5">
      <PageHeader
        title="Carte grise / Permis de conduire"
        subtitle="Vérification et enregistrement des documents véhicules et permis"
      />
      <div className="carte-grise-layout grid grid-cols-1 gap-4">
        <TableauCarteGrise sites={sites} canCreateSite={canCreateSite} addSite={addSite} siteError={siteError} onSaved={(record) => setRecords((current) => [record, ...current])} />
        <section id="carte-grise-print-area" className="carte-grise-registry space-y-3 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="carte-grise-panel-title font-semibold">Registre carte grise / permis</h2>
            <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="carte-grise-print-button print:hidden" disabled={!filteredRecords.length} onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Exporter Excel
            </Button><Button type="button" variant="outline" className="carte-grise-print-button print:hidden" disabled={!records.length} onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Imprimer le registre
            </Button></div>
          </div>
          {registryError && <p className="mb-3 text-sm text-destructive">{registryError}</p>}
          {loadingRecords ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Chargement du registre…</p>
          ) : (
            <div className="space-y-4">
              <div className="relative carte-grise-screen">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Rechercher dans le registre carte grise et permis"
                  placeholder="Rechercher par nom, CIN, immatriculation ou motif…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
              {records.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-12 text-center">
                  <p className="font-medium">Aucun enregistrement pour le moment</p>
                  <p className="mt-1 text-sm text-muted-foreground">Les contrôles enregistrés apparaîtront ici.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border carte-grise-screen">
                  <div className="max-h-[560px] overflow-auto">
                    <table className="w-full min-w-[1050px] text-sm">
                    <thead className="carte-grise-table-head sticky top-0 z-10 bg-muted/95 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                      <tr>
                        <th className="px-4 py-3">Entrée</th>
                        <th className="px-3 py-3">Sortie</th>
                        <th className="px-3 py-3">Statut</th>
                        <th className="px-3 py-3">Personne</th>
                        <th className="px-3 py-3">CIN</th>
                        <th className="px-3 py-3">Immatriculation</th>
                        <th className="px-3 py-3">Motif</th>
                        <th className="px-3 py-3">Détails</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className={`carte-grise-table-row align-top transition-colors hover:bg-muted/30 ${record.exited_at ? "carte-grise-table-row--exited" : "carte-grise-table-row--present"}`}>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                            <span className="block font-medium text-foreground">{formatDate(record.entered_at)}</span>
                            <span className="mt-0.5 block text-muted-foreground">{formatTime(record.entered_at)}</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">
                            {record.exited_at ? (
                              <>
                                <span className="block font-medium text-foreground">{formatDate(record.exited_at)}</span>
                                <span className="mt-0.5 block text-muted-foreground">{formatTime(record.exited_at)}</span>
                              </>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${record.exited_at ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-800"}`}>
                              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${record.exited_at ? "bg-muted-foreground/60" : "bg-emerald-600"}`} />
                              {record.exited_at ? "Sorti" : "Présent"}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-medium">{record.full_name || "—"}</td>
                          <td className="px-3 py-3 font-mono text-xs">{record.id_document || "—"}</td>
                          <td className="px-3 py-3 font-mono text-xs font-semibold">{record.vehicle || "—"}</td>
                          <td className="max-w-[180px] px-3 py-3 text-muted-foreground">{record.reason || "—"}</td>
                          <td className="max-w-[240px] whitespace-pre-wrap break-words px-3 py-3 text-xs text-muted-foreground">{record.equipment || "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {!record.exited_at && (
                              <Button
                                type="button"
                                size="sm"
                                className="carte-grise-exit-button"
                                disabled={exitingId !== null}
                                onClick={() => void handleExit(record)}
                              >
                                {exitingId === record.id ? "Sortie…" : "Sortie"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredRecords.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                            Aucun résultat pour cette recherche.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}
          {!loadingRecords && (
            <div className="carte-grise-print hidden">
              <h1 className="mb-1 text-xl font-bold">Registre carte grise / permis</h1>
              <p className="mb-4 text-sm">Imprimé le {new Date().toLocaleString("fr-FR")}</p>
              <table>
                <thead>
                  <tr>
                    {["Entrée", "Sortie", "Statut", "Personne", "CIN", "Immatriculation", "Motif", "Détails", "Action"].map((heading) => (
                      <th key={heading}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{formatDate(record.entered_at)} {formatTime(record.entered_at)}</td>
                      <td>{record.exited_at ? `${formatDate(record.exited_at)} ${formatTime(record.exited_at)}` : "—"}</td>
                      <td>{record.exited_at ? "Sorti" : "Présent"}</td>
                      <td>{record.full_name || "—"}</td>
                      <td>{record.id_document || "—"}</td>
                      <td>{record.vehicle || "—"}</td>
                      <td>{record.reason || "—"}</td>
                      <td>{record.equipment || "—"}</td>
                      <td>{record.exited_at ? "—" : "Sortie"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          #carte-grise-print-area, #carte-grise-print-area * { visibility: visible !important; }
          #carte-grise-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            border: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .carte-grise-screen { display: none !important; }
          .carte-grise-print { display: block !important; }
          .carte-grise-print table { width: 100%; border-collapse: collapse; font-size: 9pt; }
          .carte-grise-print th, .carte-grise-print td { border: 1px solid #777; padding: 5px; text-align: left; vertical-align: top; }
          .carte-grise-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
