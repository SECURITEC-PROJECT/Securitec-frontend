import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type FluxType = "DECHARGEMENT" | "CHARGEMENT" | "INVENTAIRE" | "ANOMALIE" | "VIOLATION_PROCEDURE";
type TruckType = "DECHARGEMENT" | "CHARGEMENT";
type IncidentType = "ANOMALIE" | "VIOLATION_PROCEDURE";
type FluxEntry = { id: string; date: string; type: TruckType | "INVENTAIRE"; camion?: string; transporteur?: string; document?: string; plomb?: string; categorieStock?: string; article?: string; quantite?: string | number; siteName?: string };
type LogisticsEvent = { id: string; date: string; time: string; type: IncidentType; camion?: string; transporteur?: string; document?: string; broken?: string; missing?: string; empty?: string; phn?: string; facts?: string; person?: string; observations?: string; measures?: string; siteName?: string };
type ProductQuantity = { article: string; quantite: string };

const EMPTY_PRODUCTS = ["C12/100", "C24/30", "C20/65", "C20/50", "C24/33", "C24/33", "CV12", "CV20", "CV24", "CV16", "Intercal plastiques"];
const FULL_PRODUCTS = ["EV 50 P12", "EV 150 P6", "CR 100 P8", "CR 200 P6"];
const today = () => new Date().toLocaleDateString("en-CA");
const nowTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const emptyTruck = () => ({ date: today(), camion: "", transporteur: "", document: "", plomb: "" });
const emptyEvent = () => ({ date: today(), time: nowTime(), camion: "", transporteur: "", document: "", broken: "", missing: "", empty: "", phn: "", facts: "", person: "", observations: "", measures: "" });
const products = (names: string[]): ProductQuantity[] => names.map((article) => ({ article, quantite: "" }));

export default function FluxLogistique() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [tab, setTab] = useState<FluxType>("DECHARGEMENT");
  const [entries, setEntries] = useState<FluxEntry[]>([]);
  const [events, setEvents] = useState<LogisticsEvent[]>([]);
  const [truckForm, setTruckForm] = useState(emptyTruck);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [stockDate, setStockDate] = useState(today());
  const [stockCategory, setStockCategory] = useState("VIDES");
  const [stockItems, setStockItems] = useState(products(EMPTY_PRODUCTS));
  const [saving, setSaving] = useState(false);
  const site = useMemo(() => sites.find((item) => item.name === siteName), [sites, siteName]);
  const isAgency = (site?.type || siteType) === "AGENCE";
  const truckTabs: FluxType[] = isAgency ? ["DECHARGEMENT", "CHARGEMENT", "INVENTAIRE"] : ["DECHARGEMENT", "CHARGEMENT"];
  const visibleTabs: FluxType[] = [...truckTabs, "ANOMALIE", "VIOLATION_PROCEDURE"];
  const siteProps = {
    id: "logistics-site", value: siteName, type: siteType, sites, canCreate: canCreateSite, onAdd: addSite,
    onChange: (name: string, type: "USINE" | "AGENCE") => { setSiteName(name); setSiteType(type); },
  };
  const loadEntries = async (siteId?: string) => {
    try {
      const [flows, reports] = await Promise.all([serviceApi.listLogistics(siteId), serviceApi.listLogisticsEvents(siteId)]);
      setEntries(flows);
      setEvents(reports);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Chargement des flux logistiques impossible."); }
  };

  useEffect(() => {
    if (!siteName && sites.length > 0) {
      setSiteName(sites[0].name);
      setSiteType(sites[0].type);
    }
  }, [siteName, sites]);

  useEffect(() => { void loadEntries(site?.id); }, [site?.id]);
  useEffect(() => { setStockItems(products(stockCategory === "VIDES" ? EMPTY_PRODUCTS : FULL_PRODUCTS)); }, [stockCategory]);
  useEffect(() => { if (!visibleTabs.includes(tab)) setTab("DECHARGEMENT"); }, [site?.type, siteType]);

  const saveTruck = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const result = await serviceApi.createLogistics({ ...truckForm, type: tab, siteId: site?.id, siteName, siteType });
      if (!result.entry) throw new Error("La réponse du serveur ne contient pas le mouvement enregistré.");
      setEntries((current) => [result.entry, ...current]); setTruckForm(emptyTruck());
      toast.success(tab === "CHARGEMENT" ? "Chargement enregistré." : "Déchargement enregistré.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };

  const saveStock = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const result = await serviceApi.createLogistics({ type: "INVENTAIRE", date: stockDate, categorieStock: stockCategory, items: stockItems, siteId: site?.id, siteName, siteType });
      setEntries((current) => [...(result.entries || []), ...current]);
      setStockItems(products(stockCategory === "VIDES" ? EMPTY_PRODUCTS : FULL_PRODUCTS));
      toast.success("Inventaire de stock enregistré.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };

  const saveEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (tab !== "ANOMALIE" && tab !== "VIOLATION_PROCEDURE") return;
    setSaving(true);
    try {
      const entry = await serviceApi.createLogisticsEvent({ ...eventForm, type: tab, siteId: site?.id, siteName, siteType });
      setEvents((current) => [entry, ...current]); setEventForm(emptyEvent());
      toast.success(tab === "ANOMALIE" ? "Anomalie enregistrée." : "Violation de procédure enregistrée.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Enregistrement du signalement impossible."); }
    finally { setSaving(false); }
  };

  const displayedEntries = entries.filter((entry) => entry.type === tab);
  const displayedEvents = events.filter((entry) => entry.type === tab);
  const anomalyNumber = isAgency ? 9 : 8;
  const violationNumber = isAgency ? 10 : 9;
  const documentLabel = tab === "DECHARGEMENT"
    ? (isAgency ? "N° titre ou REV" : "N° titre")
    : (isAgency ? "N° titre ou facture" : "N° titre");
  const transporterLabel = isAgency ? "Transporteur ou client" : "Transporteur";
  const eventTitle = tab === "ANOMALIE" ? `${anomalyNumber} · Anomalies` : `${violationNumber} · Violation de procédure`;

  return <div>
    <PageHeader title="Flux logistiques" subtitle="Flux camions, inventaire, anomalies et violations de procédure du rapport journalier" />
    <div className="mb-5 max-w-xl"><SitePicker {...siteProps} /></div>
    {siteError && <p className="mb-4 text-sm text-destructive">{siteError}</p>}
    <div className="mb-5 flex flex-wrap gap-2 border-b pb-3" role="tablist" aria-label="Flux logistiques">
      {visibleTabs.map((value) => <Button key={value} role="tab" aria-selected={tab === value} variant={tab === value ? "default" : "secondary"} onClick={() => setTab(value)}>
        {value === "DECHARGEMENT" ? "3 · Déchargement" : value === "CHARGEMENT" ? "4 · Chargement" : value === "INVENTAIRE" ? "5 · Inventaire" : value === "ANOMALIE" ? `${anomalyNumber} · Anomalies` : `${violationNumber} · Violation de procédure`}
      </Button>)}
    </div>

    {tab === "DECHARGEMENT" || tab === "CHARGEMENT" ? <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.75fr)_minmax(500px,1.4fr)]">
      <Panel title={tab === "DECHARGEMENT" ? "Camions, VL et VD reçus" : "Camions, VL et VD chargés"}>
        <form className="space-y-4" onSubmit={(event) => void saveTruck(event)}>
          <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">Numéro du camion et de la remorque, transporteur/client, titre ou facture/REV et numéro de plomb.</p>
          <div><Label htmlFor="flux-date">Date</Label><Input id="flux-date" type="date" required value={truckForm.date} onChange={(e) => setTruckForm({ ...truckForm, date: e.target.value })} /></div>
          <div><Label htmlFor="flux-truck">N° camion + remorque</Label><Input id="flux-truck" required placeholder="Ex. 1234 TAA / remorque 5678" value={truckForm.camion} onChange={(e) => setTruckForm({ ...truckForm, camion: e.target.value })} /></div>
          <div><Label htmlFor="flux-carrier">{transporterLabel}</Label><Input id="flux-carrier" value={truckForm.transporteur} onChange={(e) => setTruckForm({ ...truckForm, transporteur: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="flux-document">{documentLabel}</Label><Input id="flux-document" value={truckForm.document} onChange={(e) => setTruckForm({ ...truckForm, document: e.target.value })} /></div><div><Label htmlFor="flux-seal">N° plomb</Label><Input id="flux-seal" value={truckForm.plomb} onChange={(e) => setTruckForm({ ...truckForm, plomb: e.target.value })} /></div></div>
          <Button className="w-full" disabled={saving || (!site && !siteName.trim())}>{tab === "CHARGEMENT" ? "Enregistrer le chargement" : "Enregistrer le déchargement"}</Button>
        </form>
      </Panel>
      <Panel title={tab === "DECHARGEMENT" ? "Registre des réceptions" : "Registre des chargements"}>
        <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="border-b text-muted-foreground"><tr>{["Date", "N° camion + remorque", transporterLabel, documentLabel, "N° plomb", "Site"].map((label) => <th key={label} className="py-3 pr-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y">{displayedEntries.map((entry) => <tr key={entry.id}><td className="py-3 pr-3">{String(entry.date).slice(0, 10)}</td><td className="pr-3 font-medium">{entry.camion}</td><td className="pr-3">{entry.transporteur || "—"}</td><td className="pr-3">{entry.document || "—"}</td><td className="pr-3">{entry.plomb || "—"}</td><td>{entry.siteName}</td></tr>)}</tbody></table>{displayedEntries.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucun mouvement enregistré.</p>}</div>
      </Panel>
    </div> : tab === "INVENTAIRE" ? <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.75fr)_minmax(500px,1.4fr)]">
      <Panel title="Inventaire du stock extérieur magasin">
        <form className="space-y-4" onSubmit={(event) => void saveStock(event)}>
          <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">Modèle Agence : saisie des quantités par palette pour les stocks vides et pleins/eaux.</p>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="stock-date">Date de l’inventaire</Label><Input id="stock-date" type="date" required value={stockDate} onChange={(e) => setStockDate(e.target.value)} /></div><div><Label htmlFor="stock-category">Catégorie</Label><select id="stock-category" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={stockCategory} onChange={(e) => setStockCategory(e.target.value)}><option value="VIDES">Vides</option><option value="PLEINS_EAUX">Pleins / eaux</option></select></div></div>
          <div className="space-y-2">{stockItems.map((item, index) => <div key={`${item.article}-${index}`} className="grid grid-cols-[1fr_120px] items-center gap-3"><Label htmlFor={`stock-${index}`}>{item.article}</Label><Input id={`stock-${index}`} type="number" min="0" step="0.01" inputMode="decimal" aria-label={`Quantité par palette · ${item.article}`} value={item.quantite} onChange={(e) => setStockItems((current) => current.map((row, i) => i === index ? { ...row, quantite: e.target.value } : row))} /></div>)}</div>
          <Button className="w-full" disabled={saving || (!site && !siteName.trim())}>Enregistrer l’inventaire</Button>
        </form>
      </Panel>
      <Panel title="Historique des inventaires">
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="border-b text-muted-foreground"><tr>{["Date", "Catégorie", "Article", "Quantité par palette", "Site"].map((label) => <th key={label} className="py-3 pr-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y">{displayedEntries.map((entry) => <tr key={entry.id}><td className="py-3 pr-3">{String(entry.date).slice(0, 10)}</td><td className="pr-3">{entry.categorieStock === "VIDES" ? "Vides" : "Pleins / eaux"}</td><td className="pr-3">{entry.article}</td><td className="pr-3">{entry.quantite}</td><td>{entry.siteName}</td></tr>)}</tbody></table>{displayedEntries.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucun inventaire enregistré.</p>}</div>
      </Panel>
    </div> : <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.75fr)_minmax(500px,1.4fr)]">
      <Panel title={eventTitle}>
        <form className="space-y-4" onSubmit={(event) => void saveEvent(event)}>
          {tab === "ANOMALIE" ? <>
            <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">Rubrique Excel : date et heure, camion, transporteur/client, titre, casse, manquants, vides, PHN et description des faits.</p>
            <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="event-date">Date de l’anomalie</Label><Input id="event-date" type="date" required value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} /></div><div><Label htmlFor="event-time">Heure</Label><Input id="event-time" type="time" required value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} /></div></div>
            <div><Label htmlFor="event-truck">N° camion</Label><Input id="event-truck" value={eventForm.camion} onChange={(e) => setEventForm({ ...eventForm, camion: e.target.value })} /></div>
            <div><Label htmlFor="event-carrier">{transporterLabel}</Label><Input id="event-carrier" value={eventForm.transporteur} onChange={(e) => setEventForm({ ...eventForm, transporteur: e.target.value })} /></div>
            <div><Label htmlFor="event-document">{isAgency ? "TT / facture / REV" : "Titre"}</Label><Input id="event-document" value={eventForm.document} onChange={(e) => setEventForm({ ...eventForm, document: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="event-broken">Cassé</Label><Input id="event-broken" value={eventForm.broken} onChange={(e) => setEventForm({ ...eventForm, broken: e.target.value })} /></div><div><Label htmlFor="event-missing">Manquant</Label><Input id="event-missing" value={eventForm.missing} onChange={(e) => setEventForm({ ...eventForm, missing: e.target.value })} /></div><div><Label htmlFor="event-empty">Vides</Label><Input id="event-empty" value={eventForm.empty} onChange={(e) => setEventForm({ ...eventForm, empty: e.target.value })} /></div><div><Label htmlFor="event-phn">PHN</Label><Input id="event-phn" value={eventForm.phn} onChange={(e) => setEventForm({ ...eventForm, phn: e.target.value })} /></div></div>
            <div><Label htmlFor="event-facts">Description des faits</Label><textarea id="event-facts" required maxLength={20000} value={eventForm.facts} onChange={(e) => setEventForm({ ...eventForm, facts: e.target.value })} className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
          </> : <>
            <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">Rubrique Excel : heure, nom et prénom, observations et mesures prises.</p>
            <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="violation-date">Date</Label><Input id="violation-date" type="date" required value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} /></div><div><Label htmlFor="violation-time">Heure</Label><Input id="violation-time" type="time" required value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} /></div></div>
            <div><Label htmlFor="violation-person">Nom et prénom</Label><Input id="violation-person" required value={eventForm.person} onChange={(e) => setEventForm({ ...eventForm, person: e.target.value })} /></div>
            <div><Label htmlFor="violation-observations">Observations</Label><textarea id="violation-observations" required maxLength={20000} value={eventForm.observations} onChange={(e) => setEventForm({ ...eventForm, observations: e.target.value })} className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><Label htmlFor="violation-measures">Mesures prises</Label><textarea id="violation-measures" maxLength={20000} value={eventForm.measures} onChange={(e) => setEventForm({ ...eventForm, measures: e.target.value })} className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
          </>}
          <Button className="w-full" disabled={saving || (!site && !siteName.trim())}>{saving ? "Enregistrement…" : "Enregistrer le signalement"}</Button>
        </form>
      </Panel>
      <Panel title={`Historique · ${eventTitle}`}>
        {displayedEvents.length ? <div className="space-y-3">{displayedEvents.map((entry) => <article key={entry.id} className="rounded-md border p-3 text-sm">
          <div className="mb-2 flex flex-wrap justify-between gap-2 font-medium"><span>{entry.date} · {entry.time}</span><span className="text-xs text-muted-foreground">{entry.siteName}</span></div>
          {entry.type === "ANOMALIE" ? <><p>Camion : {entry.camion || "—"} · {entry.transporteur || "—"}</p><p>Titre : {entry.document || "—"} · Cassé : {entry.broken || "—"} · Manquant : {entry.missing || "—"} · Vides : {entry.empty || "—"} · PHN : {entry.phn || "—"}</p><p className="mt-2 whitespace-pre-wrap">Faits : {entry.facts}</p></> : <><p>Personne : {entry.person}</p><p className="mt-2 whitespace-pre-wrap">Observations : {entry.observations}</p><p className="mt-1 whitespace-pre-wrap">Mesures prises : {entry.measures || "—"}</p></>}
        </article>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">Aucun signalement enregistré.</p>}
      </Panel>
    </div>}
  </div>;
}
