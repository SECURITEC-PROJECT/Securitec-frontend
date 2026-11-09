import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ChevronLeft, ChevronRight, Pencil, Plus, Printer, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";
import type { VehicleMovement } from "@/lib/service-api";
import { printRecord } from "@/lib/printRecord";
import { isWithinRegistryPeriod, RegistryPeriodExport } from "@/components/RegistryPeriodExport";
import { RegistryAuditHistory } from "@/components/RegistryAuditHistory";
import { RegistryAttachments } from "@/components/RegistryAttachments";

const formatDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

export default function RegistreVehicules({
  rows,
  siteName,
  onCreate,
  onEdit,
  onDelete,
}: {
  rows: VehicleMovement[];
  siteName?: string;
  onCreate: () => void;
  onEdit: (vehicle: VehicleMovement) => void;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const filtered = useMemo(() => rows.filter((vehicle) => {
    const matchesPeriod = isWithinRegistryPeriod(vehicle.entryDate, periodStart, periodEnd);
    const matchesSearch = [vehicle.plate, vehicle.ownerName, vehicle.category].join(" ").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
    const status = vehicle.annuleLe ? "cancelled" : vehicle.pendingSync ? "pending" : vehicle.exited_at ? "exited" : "present";
    return matchesPeriod && matchesSearch && (statusFilter === "all" || statusFilter === status);
  }), [rows, periodStart, periodEnd, search, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageNumbers = Array.from(
    { length: Math.min(pageCount, currentPage + 1) - Math.max(1, currentPage - 1) + 1 },
    (_, index) => Math.max(1, currentPage - 1) + index,
  );

  const handlePrint = () => {
    const originalTitle = window.document.title;
    window.document.title = "Registre des mouvements véhicule";
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const printEntry = (vehicle: VehicleMovement) => {
    printRecord("Mouvement véhicule", siteName || "", [
      ["Date", formatDate(vehicle.entryDate)],
      ["Matricule du véhicule", vehicle.plate || "—"],
      ["Propriétaire (prénom)", vehicle.ownerName || "—"],
      ["Type de propriétaire", vehicle.category || "—"],
      ["Personnes à l’entrée", String(vehicle.passengersEntry ?? "—")],
      ["Heure d’entrée", vehicle.entryTime || "—"],
      ["Date de sortie", vehicle.exitDate ? formatDate(vehicle.exitDate) : "—"],
      ["Personnes à la sortie", String(vehicle.passengersOut ?? "—")],
      ["Heure de sortie", vehicle.exitTime || "—"],
    ]);
  };

  const deleteEntry = async (vehicle: VehicleMovement) => {
    const message = vehicle.id.startsWith("pending-")
      ? `Supprimer l’entrée véhicule non synchronisée « ${vehicle.plate} » de cet appareil ?`
      : `Annuler le mouvement du véhicule « ${vehicle.plate} » ? Il restera dans l’historique.`;
    if (vehicle.annuleLe || !(await confirmDeletion(message))) return;
    setDeletingId(vehicle.id);
    try {
      const pendingSync = await onDelete(vehicle.id);
      if (vehicle.id.startsWith("pending-")) toast.info("Entrée véhicule non synchronisée supprimée de cet appareil.");
      else if (pendingSync) toast.info("Annulation enregistrée sur cet appareil, en attente de synchronisation.");
      else toast.success("Mouvement véhicule annulé et conservé dans l’historique.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Panel title="Registre des mouvements véhicule">
      <section id="vehicle-registry-print-area">
      <div className="vehicle-registry-toolbar vehicle-registry-screen">
        <Button type="button" className="vehicle-primary-action" onClick={onCreate}>
          <Plus className="h-4 w-4" />Nouveau mouvement
        </Button>
        <div className="vehicle-registry-search">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Rechercher un mouvement véhicule"
          placeholder="Rechercher par matricule, propriétaire ou catégorie…"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          className="min-h-11 pl-9"
        />
        </div>
        <div className="vehicle-registry-period">
        <RegistryPeriodExport from={periodStart} to={periodEnd} onFromChange={(value) => { setPeriodStart(value); setPage(1); }} onToChange={(value) => { setPeriodEnd(value); setPage(1); }} records={filtered} filename="mouvements-vehicules" columns={[
          { label: "Date entrée", value: (row) => row.entryDate }, { label: "Immatriculation", value: (row) => row.plate },
          { label: "Propriétaire", value: (row) => row.ownerName }, { label: "Catégorie", value: (row) => row.category },
          { label: "Nombre entrée", value: (row) => row.passengersEntry }, { label: "Heure entrée", value: (row) => row.entryTime },
          { label: "Date sortie", value: (row) => row.exitDate },
          { label: "Nombre sortie", value: (row) => row.passengersOut }, { label: "Heure sortie", value: (row) => row.exitTime },
          { label: "Annulé le", value: (row) => row.annuleLe },
        ]} />
        </div>
        <Button type="button" variant="outline" className="vehicle-print-button print:hidden" disabled={!rows.length} onClick={handlePrint}>
          <Printer className="h-4 w-4" />Imprimer les lignes (Word)
        </Button>
      </div>
      <div className="vehicle-registry-filters vehicle-registry-screen">
        <label>
          <span>Statut</span>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
            <option value="all">Tous</option>
            <option value="present">Présent sur site</option>
            <option value="exited">Sorti</option>
            <option value="pending">En attente de synchronisation</option>
            <option value="cancelled">Annulé</option>
          </select>
        </label>
        <div className="vehicle-registry-count"><CheckCircle2 aria-hidden="true" />{filtered.length} mouvement(s) trouvé(s)</div>
        <label className="vehicle-page-size">
          Afficher
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
            <option value={10}>10 lignes</option>
            <option value={25}>25 lignes</option>
            <option value={50}>50 lignes</option>
            <option value={100}>100 lignes</option>
          </select>
        </label>
      </div>
      <div className="overflow-hidden rounded-lg border vehicle-registry-screen">
        <div className="max-h-[560px] overflow-auto">
          <table className="vehicle-registry-table w-full min-w-[1220px] text-left text-sm">
            <thead className="vehicle-table-head sticky top-0 z-10 bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
              <tr>
                {["N°", "Date entrée", "Matricule du véhicule", "Propriétaire (prénom)", "Type de propriétaire", "Personnes (entrée)", "Heure d’entrée", "Date de sortie", "Personnes (sortie)", "Heure de sortie", "Statut", "Actions"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap border-b px-3 py-3 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {pageRows.map((vehicle, index) => (
                <tr key={vehicle.id} className={`vehicle-table-row ${vehicle.annuleLe ? "vehicle-table-row--cancelled" : ""}`}>
                  <td className="px-3 py-3">{(currentPage - 1) * pageSize + index + 1}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{formatDate(vehicle.entryDate)}{vehicle.annuleLe && <span className="ml-1 font-sans text-destructive">(annulé)</span>}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-medium">{vehicle.plate}</td>
                  <td className="px-3 py-3">{vehicle.ownerName || "—"}</td>
                  <td className="px-3 py-3">{vehicle.category || "—"}</td>
                  <td className="px-3 py-3 text-center">{vehicle.passengersEntry ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{vehicle.entryTime || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{vehicle.exitDate ? formatDate(vehicle.exitDate) : "—"}</td>
                  <td className="px-3 py-3 text-center">{vehicle.passengersOut ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{vehicle.exitTime || "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`vehicle-status ${vehicle.annuleLe ? "vehicle-status--cancelled" : vehicle.pendingSync ? "vehicle-status--pending" : vehicle.exited_at ? "vehicle-status--exited" : "vehicle-status--present"}`}>
                      {vehicle.annuleLe ? "Annulé" : vehicle.pendingSync ? "À synchroniser" : vehicle.exited_at ? "Sorti" : "Présent"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer le mouvement" title="Imprimer au format 80 × 80 mm" onClick={() => printEntry(vehicle)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      {!vehicle.annuleLe && <Button type="button" size="icon" variant="ghost" disabled={vehicle.pendingSync} className="h-8 w-8" aria-label="Modifier le mouvement" title="Modifier le mouvement après synchronisation" onClick={() => onEdit(vehicle)}>
                        <Pencil className="h-4 w-4" />
                      </Button>}
                      {!vehicle.annuleLe && <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label={vehicle.exited_at ? "Annuler le mouvement" : "La sortie doit être enregistrée avant l’annulation"}
                        title={vehicle.exited_at ? "Annuler le mouvement" : "Enregistrez la sortie avant d’annuler ce mouvement"}
                        disabled={(!vehicle.exited_at && !vehicle.id.startsWith("pending-")) || deletingId === vehicle.id}
                        onClick={() => void deleteEntry(vehicle)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>}
                      {!vehicle.id.startsWith("pending-") && <RegistryAuditHistory entity="passage_vehicule" recordId={vehicle.id} />}
                      {!vehicle.id.startsWith("pending-") && <RegistryAttachments entity="passage_vehicule" recordId={vehicle.id} siteId={vehicle.siteId} />}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={12} className="px-3 py-8 text-center text-sm text-muted-foreground">Aucun mouvement véhicule trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="vehicle-registry-pagination vehicle-registry-screen">
          <span>{filtered.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} sur ${filtered.length}` : "Aucun résultat"}</span>
          <div>
            <Button type="button" variant="outline" size="icon" aria-label="Page précédente" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft aria-hidden="true" /></Button>
            {pageNumbers.map((pageNumber) => (
              <Button key={pageNumber} type="button" variant={pageNumber === currentPage ? "default" : "outline"} className="vehicle-page-number" aria-current={pageNumber === currentPage ? "page" : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</Button>
            ))}
            <Button type="button" variant="outline" size="icon" aria-label="Page suivante" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight aria-hidden="true" /></Button>
          </div>
        </div>
      </div>
      <div className="vehicle-registry-print hidden">
        <h1 className="mb-1 text-xl font-bold">Registre des mouvements véhicule (entrée / sortie)</h1>
        <p className="mb-4 text-sm">Site : {siteName || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
        <table>
          <thead>
            <tr>
              {["Date entrée", "Matricule du véhicule", "Propriétaire (prénom)", "Type de propriétaire", "Personnes (entrée)", "Heure d’entrée", "Date de sortie", "Personnes (sortie)", "Heure de sortie"].map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((vehicle) => (
              <tr key={vehicle.id}>
                <td>{formatDate(vehicle.entryDate)}</td>
                <td>{vehicle.plate || "—"}</td>
                <td>{vehicle.ownerName || "—"}</td>
                <td>{vehicle.category || "—"}</td>
                <td>{vehicle.passengersEntry ?? "—"}</td>
                <td>{vehicle.entryTime || "—"}</td>
                <td>{vehicle.exitDate ? formatDate(vehicle.exitDate) : "—"}</td>
                <td>{vehicle.passengersOut ?? "—"}</td>
                <td>{vehicle.exitTime || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </section>
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          #vehicle-registry-print-area, #vehicle-registry-print-area * { visibility: visible !important; }
          #vehicle-registry-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
          }
          .vehicle-registry-screen { display: none !important; }
          .vehicle-registry-print { display: block !important; }
          .vehicle-registry-print table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .vehicle-registry-print th, .vehicle-registry-print td { border: 1px solid #777; padding: 6px; text-align: left; }
          .vehicle-registry-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </Panel>
  );
}
