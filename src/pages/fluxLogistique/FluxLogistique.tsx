import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Printer, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type TruckForm = {
  date: string;
  immatriculationVehicule: string;
  heureSortie: string;
  designation: string;
  nbr: string;
  facture: string;
};

type TruckEntry = TruckForm & {
  id: string;
  type: "DECHARGEMENT";
  siteName?: string;
};

const today = () => new Date().toLocaleDateString("en-CA");
const nowTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const emptyTruck = (): TruckForm => ({
  date: today(),
  immatriculationVehicule: "",
  heureSortie: nowTime(),
  designation: "",
  nbr: "",
  facture: "",
});

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] || character);

export default function FluxLogistique() {
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
      entry.heureSortie,
      entry.designation,
      entry.nbr,
      entry.facture,
      entry.siteName,
    ].some((value) => String(value || "").toLocaleLowerCase().includes(query)));
  }, [entries, search]);
  const [registrySearch, setRegistrySearch] = useState("");
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = sites.find((item) => item.name === selectedSiteName);
  const canPrintEntries = pathname === "/dashboard/enregistrements-bon-facture-bon-sortie";
  const filteredEntries = entries.filter((entry) =>
    [
      entry.date,
      entry.camion,
      entry.nomChauffeur,
      entry.heureArrivee,
      entry.designation,
      entry.nbr,
      entry.document,
      entry.destinataire,
      entry.siteName,
    ].some((value) => value?.toLocaleLowerCase().includes(registrySearch.trim().toLocaleLowerCase())),
  );

  useEffect(() => {
    if (!site?.id) return;
    let active = true;
    serviceApi.listLogistics(site.id)
      .then((rows) => {
        if (active) setEntries(rows.filter((entry) => entry.type === "DECHARGEMENT"));
      })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : "Chargement des réceptions impossible.");
      });
    return () => { active = false; };
  }, [site?.id]);

  const saveTruck = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!site?.id) {
      toast.error("Sélectionnez un site de travail.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...truckForm, type: "DECHARGEMENT", siteId: site.id, siteName: selectedSiteName, siteType: site.type };
      if (editingTruck) {
        const { entry } = await serviceApi.updateTruckLogistics(editingTruck.id, "DECHARGEMENT", payload);
        setEntries((current) => current.map((row) => row.id === editingTruck.id
          ? { ...row, ...entry, siteName: row.siteName }
          : row));
      } else {
        const result = await serviceApi.createLogistics(payload);
        if (!result.entry) throw new Error("La réponse du serveur ne contient pas la réception enregistrée.");
        setEntries((current) => [result.entry, ...current]);
      }
      setTruckForm(emptyTruck());
      setEditingTruck(null);
      toast.success(editingTruck ? "Réception modifiée." : "Déchargement enregistré.");
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
    });
  };

  const deleteTruck = async (entry: TruckEntry) => {
    if (!site?.id) return;
    if (!window.confirm(`Supprimer l’enregistrement du véhicule « ${entry.immatriculationVehicule} » ? Cette action est définitive.`)) return;
    try {
      await serviceApi.deleteTruckLogistics(entry.id, "DECHARGEMENT", site.id);
      setEntries((current) => current.filter((row) => row.id !== entry.id));
      if (editingTruck?.id === entry.id) {
        setEditingTruck(null);
        setTruckForm(emptyTruck());
      }
      toast.success("Réception supprimée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    }
  };

  const printEntries = (items: TruckEntry[], title: string) => {
  const handlePrintRegistry = () => {
    const originalTitle = window.document.title;
    window.document.title = "Enregistrement bon, facture et bon de sortie";
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const printEntry = (entry: TruckEntry) => {
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
        entry.heureSortie || "—",
        entry.designation || "—",
        entry.nbr || "—",
        entry.facture || "—",
      ];
      return `<tr>${cells.map((value) => `<td>${escapeHtml(String(value))}</td>`).join("")}</tr>`;
    }).join("");

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
            <thead><tr><th>Date</th><th>Véhicule (matricule)</th><th>Heure de sortie</th><th>Désignation</th><th>Nombre</th><th>Facture</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <main>
            <h1>Bon / facture / bon de sortie</h1>
            <p class="site">${escapeHtml(entry.siteName || selectedSiteName || "—")}</p>
            ${details}
            <p class="footer">Bon / facture / bon de sortie</p>
          </main>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Flux logistiques" subtitle="Enregistrement et suivi des déchargements." />
      <div className="max-w-xl">
        <SitePicker
          id="logistics-site"
          value={selectedSiteName}
          type={site?.type || siteType}
          sites={sites}
          canCreate={canCreateSite}
          onAdd={addSite}
          onChange={(name, type) => { setSiteName(name); setSiteType(type); }}
        />
      </div>
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}

      <Panel title={editingTruck ? "Modifier une réception" : "Enregistrer un déchargement"}>
        <form className="space-y-5" onSubmit={(event) => void saveTruck(event)}>
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="flux-date">Date</Label>
              <Input id="flux-date" type="date" required value={truckForm.date} onChange={(event) => setTruckForm({ ...truckForm, date: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flux-truck">Véhicule (matricule)</Label>
              <Input id="flux-truck" required maxLength={100} placeholder="Ex. 1234 TAA" value={truckForm.immatriculationVehicule} onChange={(event) => setTruckForm({ ...truckForm, immatriculationVehicule: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flux-exit-time">Heure de sortie</Label>
              <Input id="flux-exit-time" type="time" required value={truckForm.heureSortie} onChange={(event) => setTruckForm({ ...truckForm, heureSortie: event.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <Label htmlFor="flux-designation">Désignation</Label>
              <textarea
                id="flux-designation"
                required
                maxLength={20000}
                rows={5}
                value={truckForm.designation}
                onChange={(event) => setTruckForm({ ...truckForm, designation: event.target.value })}
                className="min-h-32 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flux-nbr">Nombre </Label>
              <Input id="flux-nbr" required maxLength={255} placeholder="ex : 1 voyage" value={truckForm.nbr} onChange={(event) => setTruckForm({ ...truckForm, nbr: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flux-invoice">Facture</Label>
              <Input id="flux-invoice" required maxLength={4} pattern="\d{1,4}" inputMode="numeric" title="Saisissez 1 à 4 chiffres." value={truckForm.facture} onChange={(event) => setTruckForm({ ...truckForm, facture: event.target.value })} />
            </div>
          </div>
          {!site?.id && <p className="text-sm text-muted-foreground">Sélectionnez un site pour enregistrer une réception.</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            {editingTruck && (
              <Button type="button" variant="outline" disabled={saving} onClick={() => { setEditingTruck(null); setTruckForm(emptyTruck()); }}>
                <X /> Annuler
              </Button>
            )}
            <Button disabled={saving || !site?.id}>
              {editingTruck && <Pencil />}
              {saving ? "Enregistrement…" : editingTruck ? "Enregistrer les modifications" : "Enregistrer le déchargement"}
            </Button>
          </div>
        </form>
      </Panel>

      <section id="truck-registry-print-area">
      <Panel title="Registre des réceptions">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Rechercher dans le registre"
              placeholder="Rechercher date, véhicule, désignation, facture…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!entries.length}
            onClick={() => printEntries(entries, "Registre des réceptions")}
          >
            <Printer className="h-4 w-4" />
            Imprimer tout le registre
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border">
        {canPrintEntries && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 truck-registry-screen">
            <Input
              aria-label="Rechercher un enregistrement de bon ou facture"
              placeholder="Rechercher véhicule, chauffeur, bon, facture ou destination…"
              value={registrySearch}
              onChange={(event) => setRegistrySearch(event.target.value)}
              className="min-h-11 max-w-xl"
            />
            <Button type="button" variant="outline" className="print:hidden" disabled={!entries.length} onClick={handlePrintRegistry}>
              <Printer className="mr-2 h-4 w-4" /> Imprimer le registre
            </Button>
          </div>
        )}
        <div className={`overflow-hidden rounded-lg border ${canPrintEntries ? "truck-registry-screen" : ""}`}>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                <tr>
                  {["Date", "Véhicule (matricule)", "Heure de sortie", "Désignation", "Nombre", "Facture", "Site", "Actions"].map((label) => (
                    <th key={label} className="whitespace-nowrap border-b px-3 py-3 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredEntries.map((entry) => (
                {(canPrintEntries ? filteredEntries : entries).map((entry) => (
                  <tr key={entry.id} className="align-top transition-colors hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-3">{String(entry.date).slice(0, 10)}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-medium">{entry.immatriculationVehicule || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3">{entry.heureSortie || "—"}</td>
                    <td className="max-w-md whitespace-pre-wrap px-3 py-3">{entry.designation || "—"}</td>
                    <td className="px-3 py-3">{entry.nbr || "—"}</td>
                    <td className="px-3 py-3">{entry.facture || "—"}</td>
                    <td className="px-3 py-3">{entry.siteName || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer la ligne" title="Imprimer la ligne" onClick={() => printEntries([entry], "Enregistrement de réception")}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Modifier la réception" title="Modifier la réception" onClick={() => editTruck(entry)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Supprimer la réception" title="Supprimer la réception" onClick={() => void deleteTruck(entry)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredEntries.length && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {entries.length ? "Aucun résultat pour cette recherche." : "Aucune réception enregistrée."}
                  </td></tr>
                {!(canPrintEntries ? filteredEntries : entries).length && (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-sm text-muted-foreground">Aucune réception enregistrée.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {canPrintEntries && (
          <div className="truck-registry-print hidden">
            <h1 className="mb-1 text-xl font-bold">Registre des enregistrements bon / facture / bon de sortie</h1>
            <p className="mb-4 text-sm">Site : {selectedSiteName || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
            <table>
              <thead>
                <tr>
                  {["Date", "Transport (véhicule)", "Nom chauffeur", "Heure d’entrée", "Désignation", "NBR", "Bon ou facture", "Destination", "Site"].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{String(entry.date).slice(0, 10)}</td>
                    <td>{entry.camion || "—"}</td>
                    <td>{entry.nomChauffeur || "—"}</td>
                    <td>{entry.heureArrivee || "—"}</td>
                    <td>{entry.designation || "—"}</td>
                    <td>{entry.nbr || "—"}</td>
                    <td>{entry.document || "—"}</td>
                    <td>{entry.destinataire || "—"}</td>
                    <td>{entry.siteName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      </section>
      {canPrintEntries && (
        <style>{`
          @media print {
            @page { size: landscape; margin: 12mm; }
            body * { visibility: hidden !important; }
            #truck-registry-print-area, #truck-registry-print-area * { visibility: visible !important; }
            #truck-registry-print-area {
              position: absolute !important;
              inset: 0 auto auto 0 !important;
              width: 100% !important;
            }
            .truck-registry-screen { display: none !important; }
            .truck-registry-print { display: block !important; }
            .truck-registry-print table { width: 100%; border-collapse: collapse; font-size: 9pt; }
            .truck-registry-print th, .truck-registry-print td { border: 1px solid #777; padding: 5px; text-align: left; vertical-align: top; }
            .truck-registry-print th { background: #eee !important; print-color-adjust: exact; }
          }
        `}</style>
      )}
    </div>
  );
}
