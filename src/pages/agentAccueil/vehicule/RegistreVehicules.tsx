import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Printer, Search, Trash2 } from "lucide-react";
import { useState } from "react";
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
  onEdit,
  onDelete,
}: {
  rows: VehicleMovement[];
  siteName?: string;
  onEdit: (vehicle: VehicleMovement) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const filtered = rows.filter((vehicle) => isWithinRegistryPeriod(vehicle.entryDate, periodStart, periodEnd)
    && [vehicle.plate, vehicle.ownerName, vehicle.category].join(" ").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

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
      ["Personnes à la sortie", String(vehicle.passengersOut ?? "—")],
      ["Heure de sortie", vehicle.exitTime || "—"],
    ]);
  };

  const deleteEntry = async (vehicle: VehicleMovement) => {
    if (vehicle.annuleLe || !(await confirmDeletion(`Annuler le mouvement du véhicule « ${vehicle.plate} » ? Il restera dans l’historique.`))) return;
    setDeletingId(vehicle.id);
    try {
      await onDelete(vehicle.id);
      toast.success("Mouvement véhicule annulé et conservé dans l’historique.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Panel title="Registre des mouvements véhicule">
      <section id="vehicle-registry-print-area">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 vehicle-registry-screen">
        <div className="relative min-w-[260px] flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Rechercher un mouvement véhicule"
          placeholder="Rechercher par matricule, propriétaire ou catégorie…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-11 pl-9"
        />
        </div>
        <RegistryPeriodExport from={periodStart} to={periodEnd} onFromChange={setPeriodStart} onToChange={setPeriodEnd} records={filtered} filename="mouvements-vehicules" columns={[
          { label: "Date entrée", value: (row) => row.entryDate }, { label: "Immatriculation", value: (row) => row.plate },
          { label: "Propriétaire", value: (row) => row.ownerName }, { label: "Catégorie", value: (row) => row.category },
          { label: "Nombre entrée", value: (row) => row.passengersEntry }, { label: "Heure entrée", value: (row) => row.entryTime },
          { label: "Nombre sortie", value: (row) => row.passengersOut }, { label: "Heure sortie", value: (row) => row.exitTime },
          { label: "Annulé le", value: (row) => row.annuleLe },
        ]} />
        <Button type="button" variant="outline" className="print:hidden" disabled={!rows.length} onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Imprimer le registre
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border vehicle-registry-screen">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
              <tr>
                {["Date", "Matricule du véhicule", "Propriétaire (prénom)", "Type de propriétaire", "Personnes (entrée)", "Heure d’entrée", "Personnes (sortie)", "Heure de sortie", "Actions"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap border-b px-3 py-3 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {filtered.map((vehicle) => (
                <tr key={vehicle.id} className={`transition-colors hover:bg-muted/30 ${vehicle.annuleLe ? "text-muted-foreground" : ""}`}>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{formatDate(vehicle.entryDate)}{vehicle.annuleLe && <span className="ml-1 font-sans text-destructive">(annulé)</span>}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-medium">{vehicle.plate}</td>
                  <td className="px-3 py-3">{vehicle.ownerName || "—"}</td>
                  <td className="px-3 py-3">{vehicle.category || "—"}</td>
                  <td className="px-3 py-3 text-center">{vehicle.passengersEntry ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{vehicle.entryTime || "—"}</td>
                  <td className="px-3 py-3 text-center">{vehicle.passengersOut ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{vehicle.exitTime || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer le mouvement" title="Imprimer au format 80 × 80 mm" onClick={() => printEntry(vehicle)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      {!vehicle.annuleLe && <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Modifier le mouvement" title="Modifier le mouvement" onClick={() => onEdit(vehicle)}>
                        <Pencil className="h-4 w-4" />
                      </Button>}
                      {!vehicle.annuleLe && <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label={vehicle.exited_at ? "Annuler le mouvement" : "La sortie doit être enregistrée avant l’annulation"}
                        title={vehicle.exited_at ? "Annuler le mouvement" : "Enregistrez la sortie avant d’annuler ce mouvement"}
                        disabled={!vehicle.exited_at || deletingId === vehicle.id}
                        onClick={() => void deleteEntry(vehicle)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>}
                      <RegistryAuditHistory entity="passage_vehicule" recordId={vehicle.id} />
                      <RegistryAttachments entity="passage_vehicule" recordId={vehicle.id} siteId={vehicle.siteId} />
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">Aucun mouvement véhicule trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="vehicle-registry-print hidden">
        <h1 className="mb-1 text-xl font-bold">Registre des mouvements véhicule (entrée / sortie)</h1>
        <p className="mb-4 text-sm">Site : {siteName || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
        <table>
          <thead>
            <tr>
              {["Date", "Matricule du véhicule", "Propriétaire (prénom)", "Type de propriétaire", "Personnes (entrée)", "Heure d’entrée", "Personnes (sortie)", "Heure de sortie"].map((heading) => (
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
