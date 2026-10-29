import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { printRecord } from "@/lib/printRecord";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock3, Pencil, Printer, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";

type TruckForm = {
  date: string;
  immatriculationVehicule: string;
  heureSortie: string;
  designation: string;
  nbr: string;
  facture: string;
  destinataire: string;
};

type TruckEntry = TruckForm & {
  id: string;
  type: "DECHARGEMENT" | "ORDURES";
  siteName?: string;
};

const wasteDesignations = ["Verres cassées", "Ordures", "Gravat"] as const;

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const nowTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
const emptyTruck = (): TruckForm => ({
  date: today(),
  immatriculationVehicule: "",
  heureSortie: nowTime(),
  designation: "",
  nbr: "",
  facture: "",
  destinataire: "",
});

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] || character);

export default function FluxLogistique({ kind = "bon-facture" }: { kind?: "bon-facture" | "ordures" }) {
  const isWasteRegister = kind === "ordures";
  const entryType: TruckEntry["type"] = isWasteRegister ? "ORDURES" : "DECHARGEMENT";
  const pageTitle = isWasteRegister ? "Registre des ordures" : "Enregistrements Bon / facture / Bon de sortie";
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [entries, setEntries] = useState<TruckEntry[]>([]);
  const [truckForm, setTruckForm] = useState<TruckForm>(emptyTruck);
  const [editingTruck, setEditingTruck] = useState<TruckEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = sites.find((item) => item.name === selectedSiteName);
  const filteredEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => [
      entry.date,
      entry.immatriculationVehicule,
      isWasteRegister ? "" : entry.heureSortie,
      entry.designation,
      entry.nbr,
      entry.facture,
      entry.destinataire,
      entry.siteName,
    ].some((value) => String(value || "").toLocaleLowerCase().includes(query)));
  }, [entries, search, isWasteRegister]);

  useEffect(() => {
    if (!site?.id) return;
    let active = true;
    serviceApi.listLogistics(site.id)
      .then((rows) => {
        if (active) setEntries(rows.filter((entry) => entry.type === entryType));
      })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : `Chargement du registre ${isWasteRegister ? "des ordures" : "bon/facture"} impossible.`);
      });
    return () => { active = false; };
  }, [site?.id, entryType, isWasteRegister]);

  const saveTruck = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!site?.id) {
      toast.error("Sélectionnez un site de travail.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...truckForm, type: entryType, siteId: site.id, siteName: selectedSiteName, siteType: site.type };
      if (editingTruck) {
        const { entry } = await serviceApi.updateTruckLogistics(editingTruck.id, entryType, payload);
        setEntries((current) => current.map((row) => row.id === editingTruck.id
          ? { ...row, ...entry, siteName: selectedSiteName }
          : row));
      } else {
        const result = await serviceApi.createLogistics(payload);
        if (!result.entry) throw new Error("La réponse du serveur ne contient pas l’enregistrement sauvegardé.");
        setEntries((current) => [result.entry, ...current]);
      }
      setTruckForm(emptyTruck());
      setEditingTruck(null);
      toast.success(editingTruck
        ? `Enregistrement ${isWasteRegister ? "d’ordures" : "bon/facture"} modifié.`
        : `Enregistrement ${isWasteRegister ? "d’ordures" : "bon/facture"} ajouté.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editTruck = (entry: TruckEntry) => {
    setEditingTruck(entry);
    setTruckForm({
      date: String(entry.date).slice(0, 10),
      immatriculationVehicule: entry.immatriculationVehicule || "",
      heureSortie: entry.heureSortie || "",
      designation: entry.designation || "",
      nbr: entry.nbr || "",
      facture: entry.facture || "",
      destinataire: entry.destinataire || "",
    });
  };

  const deleteTruck = async (entry: TruckEntry) => {
    if (!site?.id) return;
    if (!(await confirmDeletion(`Supprimer l’enregistrement du véhicule « ${entry.immatriculationVehicule} » ? Cette action est définitive.`))) return;
    try {
      await serviceApi.deleteTruckLogistics(entry.id, entryType, site.id);
      setEntries((current) => current.filter((row) => row.id !== entry.id));
      if (editingTruck?.id === entry.id) {
        setEditingTruck(null);
        setTruckForm(emptyTruck());
      }
      toast.success(`Enregistrement ${isWasteRegister ? "d’ordures" : "bon/facture"} supprimé.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    }
  };

  const printEntries = (items: TruckEntry[], title: string) => {
    const printWindow = window.open("", "_blank", "width=700,height=800");
    if (!printWindow) {
      toast.error("Autorisez les fenêtres contextuelles pour imprimer les données.");
      return;
    }

    const tableRows = items.map((entry) => {
      const date = String(entry.date || "").slice(0, 10);
      const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join("/") : "—";
      const cells = [
        displayDate,
        entry.immatriculationVehicule || "—",
        ...(!isWasteRegister ? [entry.heureSortie || "—"] : []),
        entry.designation || "—",
        entry.nbr || "—",
        entry.facture || "—",
        entry.destinataire || "—",
      ];
      return `<tr>${cells.map((value) => `<td>${escapeHtml(String(value))}</td>`).join("")}</tr>`;
    }).join("");
    const tableHeaders = [
      "Date",
      isWasteRegister ? "Véhicule" : "Transport (matricule)",
      ...(!isWasteRegister ? ["Heure de sortie"] : []),
      "Désignation",
      "Nombre",
      isWasteRegister ? "Facture" : "Numéro Bon / Facture",
      "Destination",
    ].map((heading) => `<th>${escapeHtml(heading)}</th>`).join("");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            * { box-sizing: border-box; }
            body { color: #172033; font: 14px Arial, sans-serif; }
            h1 { margin: 0 0 6px; font-size: 21px; }
            .site { margin: 0 0 20px; color: #526078; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; border: 1px solid #d6dbe4; text-align: left; vertical-align: top; }
            th { background: #edf1f5; font-size: 11px; text-transform: uppercase; }
            td { white-space: pre-wrap; overflow-wrap: anywhere; }
            tr { break-inside: avoid; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <p class="site">Site : ${escapeHtml(items[0]?.siteName || selectedSiteName || "—")}</p>
          <table>
            <thead><tr>${tableHeaders}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  const printEntry = (entry: TruckEntry) => {
    const date = String(entry.date || "").slice(0, 10);
    const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join("/") : "—";
    printRecord(isWasteRegister ? "Enregistrement d’ordures" : "Enregistrement Bon / facture / Bon de sortie", entry.siteName || selectedSiteName, [
      ["Date", displayDate],
      [isWasteRegister ? "Véhicule" : "Transport (matricule)", entry.immatriculationVehicule || "—"],
      ...(!isWasteRegister ? [["Heure de sortie", entry.heureSortie || "—"] as [string, string]] : []),
      ["Désignation", entry.designation || "—"],
      ["Nombre", entry.nbr || "—"],
      [isWasteRegister ? "Facture" : "Numéro Bon / Facture", entry.facture || "—"],
      ["Destination", entry.destinataire || "—"],
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        subtitle={isWasteRegister ? "Saisie et suivi des sorties d’ordures par véhicule." : "Saisie et suivi des transports, bons, factures et destinations."}
      />
      <div className="max-w-xl">
        <SitePicker
          id="logistics-site"
          value={selectedSiteName}
          type={site?.type || siteType}
          sites={sites}
          canCreate={canCreateSite}
          onAdd={addSite}
          onChange={(name, type) => {
            if (name !== selectedSiteName) {
              setEntries([]);
              setEditingTruck(null);
              setTruckForm(emptyTruck());
            }
            setSiteName(name);
            setSiteType(type);
          }}
        />
      </div>
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}

      <Panel title={editingTruck ? `Modifier un enregistrement${isWasteRegister ? " d’ordures" : ""}` : isWasteRegister ? "Nouvel enregistrement d’ordures" : "Enregistrer une sortie"}>
        <form className="space-y-6" onSubmit={(event) => void saveTruck(event)}>
          {isWasteRegister && <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <div className="flex min-h-10 items-center justify-between gap-2">
                <Label htmlFor="flux-date" className="text-base font-semibold">Date</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-sm"
                  aria-label="Définir la date du jour"
                  onClick={() => setTruckForm((current) => ({ ...current, date: today() }))}
                >
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                  Aujourd’hui
                </Button>
              </div>
              <Input
                id="flux-date"
                type="date"
                required
                className="h-12 text-base"
                value={truckForm.date}
                onChange={(event) => setTruckForm({ ...truckForm, date: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-truck" className="flex min-h-10 items-center text-base font-semibold">Véhicule</Label>
              <Input
                id="flux-truck"
                className="h-12 text-base"
                required
                maxLength={100}
                placeholder="Ex. 4586 TBC"
                value={truckForm.immatriculationVehicule}
                onChange={(event) => setTruckForm({ ...truckForm, immatriculationVehicule: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-designation" className="flex min-h-10 items-center text-base font-semibold">Désignation</Label>
              <select
                id="flux-designation"
                required
                value={truckForm.designation}
                onChange={(event) => setTruckForm({ ...truckForm, designation: event.target.value })}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Sélectionner une désignation</option>
                {wasteDesignations.map((designation) => <option key={designation} value={designation}>{designation}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-destination" className="flex min-h-10 items-center text-base font-semibold">Destination</Label>
              <Input
                id="flux-destination"
                className="h-12 text-base"
                required
                maxLength={255}
                value={truckForm.destinataire}
                onChange={(event) => setTruckForm({ ...truckForm, destinataire: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-nbr" className="flex min-h-10 items-center text-base font-semibold">Nombre</Label>
              <Input
                id="flux-nbr"
                className="h-12 text-base"
                required
                maxLength={255}
                placeholder="Ex. : 1 voyage"
                value={truckForm.nbr}
                onChange={(event) => setTruckForm({ ...truckForm, nbr: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-invoice" className="flex min-h-10 items-center text-base font-semibold">Facture</Label>
              <Input
                id="flux-invoice"
                className="h-12 text-base"
                required
                maxLength={160}
                pattern="\\d+"
                inputMode="numeric"
                title="Saisissez un numéro de facture."
                value={truckForm.facture}
                onChange={(event) => setTruckForm({ ...truckForm, facture: event.target.value })}
              />
            </div>
          </div>}
          {!isWasteRegister && <>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <div className="flex min-h-10 items-center justify-between gap-2">
                <Label htmlFor="flux-date" className="text-base font-semibold">Date</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-sm"
                  aria-label="Définir la date du jour"
                  onClick={() => setTruckForm((current) => ({ ...current, date: today() }))}
                >
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                  Aujourd’hui
                </Button>
              </div>
              <Input
                id="flux-date"
                type="date"
                required
                className="h-12 text-base"
                value={truckForm.date}
                onChange={(event) => setTruckForm({ ...truckForm, date: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-truck" className="flex min-h-10 items-center text-base font-semibold">Transport (matricule)</Label>
              <Input
                id="flux-truck"
                className="h-12 text-base"
                required
                maxLength={100}
                placeholder="Ex. 4586 TBC"
                value={truckForm.immatriculationVehicule}
                onChange={(event) => setTruckForm({ ...truckForm, immatriculationVehicule: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex min-h-10 items-center justify-between gap-2">
                <Label htmlFor="flux-exit-time" className="text-base font-semibold">Heure de sortie</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-sm"
                  aria-label="Définir l’heure actuelle"
                  onClick={() => setTruckForm((current) => ({ ...current, heureSortie: nowTime() }))}
                >
                  <Clock3 className="h-5 w-5" aria-hidden="true" />
                  Maintenant
                </Button>
              </div>
              <Input
                id="flux-exit-time"
                type="time"
                required
                className="h-12 text-base"
                value={truckForm.heureSortie}
                onChange={(event) => setTruckForm({ ...truckForm, heureSortie: event.target.value })}
              />
            </div>
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="flux-designation" className="flex min-h-10 items-center text-base font-semibold">Désignation</Label>
              <Input
                id="flux-designation"
                required
                maxLength={20000}
                value={truckForm.designation}
                onChange={(event) => setTruckForm({ ...truckForm, designation: event.target.value })}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-destination" className="flex min-h-10 items-center text-base font-semibold">Destination</Label>
              <Input
                id="flux-destination"
                className="h-12 text-base"
                required
                maxLength={255}
                value={truckForm.destinataire}
                onChange={(event) => setTruckForm({ ...truckForm, destinataire: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-nbr" className="flex min-h-10 items-center text-base font-semibold">Nombre</Label>
              <Input
                id="flux-nbr"
                className="h-12 text-base"
                required
                maxLength={255}
                placeholder="Ex. : 1 voyage"
                value={truckForm.nbr}
                onChange={(event) => setTruckForm({ ...truckForm, nbr: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-invoice" className="flex min-h-10 items-center text-base font-semibold">Numéro Bon / Facture</Label>
              <Input
                id="flux-invoice"
                className="h-12 text-base"
                required
                maxLength={4}
                pattern="\\d{1,4}"
                inputMode="numeric"
                title="Saisissez 1 à 4 chiffres."
                value={truckForm.facture}
                onChange={(event) => setTruckForm({ ...truckForm, facture: event.target.value })}
              />
            </div>
          </div>
          </>}
          {!site?.id && <p className="text-base text-muted-foreground">Sélectionnez un site pour ajouter un enregistrement.</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            {editingTruck && (
              <Button type="button" variant="outline" className="h-11 px-5 text-base" disabled={saving} onClick={() => { setEditingTruck(null); setTruckForm(emptyTruck()); }}>
                <X /> Annuler
              </Button>
            )}
            <Button className="h-11 px-5 text-base" disabled={saving || !site?.id}>
              {editingTruck && <Pencil />}
              {saving ? "Enregistrement…" : editingTruck ? "Enregistrer les modifications" : isWasteRegister ? "Ajouter au registre" : "Enregistrer la sortie"}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title={pageTitle}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Rechercher dans le registre"
              placeholder={`Rechercher date, véhicule, désignation, facture, destination…`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!entries.length}
            onClick={() => printEntries(entries, pageTitle)}
          >
            <Printer className="h-4 w-4" />
            Imprimer tout le registre
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                <tr>
                  {["Date", isWasteRegister ? "Véhicule" : "Transport (matricule)", ...(!isWasteRegister ? ["Heure de sortie"] : []), "Désignation", "Nombre", isWasteRegister ? "Facture" : "Numéro Bon / Facture", "Destination", ...(!isWasteRegister ? ["Site"] : []), "Actions"].map((label) => (
                    <th key={label} className="whitespace-nowrap border-b px-3 py-3 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="align-top transition-colors hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-3">{String(entry.date).slice(0, 10)}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-medium">{entry.immatriculationVehicule || "—"}</td>
                    {!isWasteRegister && <td className="whitespace-nowrap px-3 py-3">{entry.heureSortie || "—"}</td>}
                    <td className="max-w-md whitespace-pre-wrap px-3 py-3">{entry.designation || "—"}</td>
                    <td className="px-3 py-3">{entry.nbr || "—"}</td>
                    <td className="px-3 py-3">{entry.facture || "—"}</td>
                    <td className="px-3 py-3">{entry.destinataire || "—"}</td>
                    {!isWasteRegister && <td className="px-3 py-3">{entry.siteName || "—"}</td>}
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer la ligne" title="Imprimer au format 80 × 80 mm" onClick={() => printEntry(entry)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Modifier l’enregistrement" title="Modifier l’enregistrement" onClick={() => editTruck(entry)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Supprimer l’enregistrement" title="Supprimer l’enregistrement" onClick={() => void deleteTruck(entry)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredEntries.length && (
                  <tr><td colSpan={isWasteRegister ? 7 : 9} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {entries.length ? "Aucun résultat pour cette recherche." : `Aucun enregistrement ${isWasteRegister ? "d’ordures" : "bon/facture"} pour ce site.`}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    </div>
  );
}
