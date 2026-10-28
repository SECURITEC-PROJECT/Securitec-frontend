import { useEffect, useState, type FormEvent } from "react";
import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Printer, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

type TruckForm = {
  date: string;
  camion: string;
  nomChauffeur: string;
  heureArrivee: string;
  designation: string;
  nbr: string;
  document: string;
  destinataire: string;
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
  camion: "",
  nomChauffeur: "",
  heureArrivee: nowTime(),
  designation: "",
  nbr: "",
  document: "",
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

export default function FluxLogistique() {
  const { pathname } = useLocation();
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [entries, setEntries] = useState<TruckEntry[]>([]);
  const [truckForm, setTruckForm] = useState<TruckForm>(emptyTruck);
  const [editingTruck, setEditingTruck] = useState<TruckEntry | null>(null);
  const [saving, setSaving] = useState(false);
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
      const payload = { ...truckForm, type: "DECHARGEMENT", siteId: site.id, siteName, siteType };
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
      camion: entry.camion || "",
      nomChauffeur: entry.nomChauffeur || "",
      heureArrivee: entry.heureArrivee || "",
      designation: entry.designation || "",
      nbr: entry.nbr || "",
      document: entry.document || "",
      destinataire: entry.destinataire || "",
    });
  };

  const deleteTruck = async (entry: TruckEntry) => {
    if (!site?.id) return;
    if (!window.confirm(`Supprimer la réception du véhicule « ${entry.camion} » ? Cette action est définitive.`)) return;
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

    const date = String(entry.date || "").slice(0, 10);
    const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join("/") : "—";
    const rows = [
      ["Date", displayDate],
      ["Transport (véhicule)", entry.camion || "—"],
      ["Nom chauffeur", entry.nomChauffeur || "—"],
      ["Heure d’entrée", entry.heureArrivee || "—"],
      ["Désignation", entry.designation || "—"],
      ["NBR", entry.nbr || "—"],
      ["Bon ou facture", entry.document || "—"],
      ["Destination", entry.destinataire || "—"],
    ];
    const details = rows.map(([label, value]) =>
      `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
    ).join("");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>Enregistrement bon / facture / bon de sortie</title>
          <style>
            @page { size: A5 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body { color: #172033; font: 14px Arial, sans-serif; }
            main { max-width: 700px; margin: 0 auto; }
            h1 { margin: 0 0 6px; text-align: center; font-size: 21px; }
            .site { margin: 0 0 24px; text-align: center; color: #526078; }
            .row { display: flex; justify-content: space-between; gap: 20px; border-bottom: 1px solid #d6dbe4; padding: 12px 4px; }
            .row span { color: #526078; }
            strong { max-width: 65%; text-align: right; white-space: pre-wrap; overflow-wrap: anywhere; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #68758a; }
          </style>
        </head>
        <body>
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
              <Label htmlFor="flux-truck">Transport (numéro du véhicule)</Label>
              <Input id="flux-truck" required maxLength={160} placeholder="Ex. 1234 TAA" value={truckForm.camion} onChange={(event) => setTruckForm({ ...truckForm, camion: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flux-driver">Nom du chauffeur</Label>
              <Input id="flux-driver" required maxLength={255} value={truckForm.nomChauffeur} onChange={(event) => setTruckForm({ ...truckForm, nomChauffeur: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flux-entry-time">Heure d’entrée</Label>
              <Input id="flux-entry-time" type="time" required value={truckForm.heureArrivee} onChange={(event) => setTruckForm({ ...truckForm, heureArrivee: event.target.value })} />
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
              <Label htmlFor="flux-nbr">NBR</Label>
              <Input id="flux-nbr" required maxLength={255} value={truckForm.nbr} onChange={(event) => setTruckForm({ ...truckForm, nbr: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flux-document">Numéro de bon ou facture</Label>
              <Input id="flux-document" required maxLength={160} value={truckForm.document} onChange={(event) => setTruckForm({ ...truckForm, document: event.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="flux-destination">Destination</Label>
              <Input id="flux-destination" required maxLength={255} value={truckForm.destinataire} onChange={(event) => setTruckForm({ ...truckForm, destinataire: event.target.value })} />
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
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                <tr>
                  {["Date", "Transport (véhicule)", "Nom chauffeur", "Heure d’entrée", "Désignation", "NBR", "Bon ou facture", "Destination", "Site", "Actions"].map((label) => (
                    <th key={label} className="whitespace-nowrap border-b px-3 py-3 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {(canPrintEntries ? filteredEntries : entries).map((entry) => (
                  <tr key={entry.id} className="align-top transition-colors hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-3">{String(entry.date).slice(0, 10)}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-medium">{entry.camion || "—"}</td>
                    <td className="px-3 py-3">{entry.nomChauffeur || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3">{entry.heureArrivee || "—"}</td>
                    <td className="max-w-md whitespace-pre-wrap px-3 py-3">{entry.designation || "—"}</td>
                    <td className="px-3 py-3">{entry.nbr || "—"}</td>
                    <td className="px-3 py-3">{entry.document || "—"}</td>
                    <td className="px-3 py-3">{entry.destinataire || "—"}</td>
                    <td className="px-3 py-3">{entry.siteName || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-1">
                      {canPrintEntries && (
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer les données" title="Imprimer" onClick={() => printEntry(entry)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      )}
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
