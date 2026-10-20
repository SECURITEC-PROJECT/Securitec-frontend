import { useEffect, useState, type ReactNode } from "react";
import { Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Row = Record<string, string>;
type Column = { key: string; label: string; type?: string; options?: string[] };
const today = () => new Date().toLocaleDateString("en-CA");
const fields = (keys: string[]) => keys.map((key) => ({ key, label: key }));
const KEY_COLS: Column[] = [
  { key: "lieu", label: "Lieu" }, { key: "perceptionMatin", label: "Perception matin · heure", type: "time" },
  { key: "responsablePerceptionMatin", label: "Responsable" }, { key: "reintegrationMatin", label: "Réintégration matin · heure", type: "time" },
  { key: "responsableReintegrationMatin", label: "Responsable" }, { key: "perceptionApresMidi", label: "Perception après-midi · heure", type: "time" },
  { key: "responsablePerceptionApresMidi", label: "Responsable" }, { key: "reintegrationApresMidi", label: "Réintégration après-midi · heure", type: "time" },
  { key: "responsableReintegrationApresMidi", label: "Responsable" }, { key: "observations", label: "Observations" },
];
const TRUCK_COLS: Column[] = [
  { key: "truck", label: "N° camion + remorque" }, { key: "transporter", label: "Transporteur / client" },
  { key: "document", label: "N° titre / facture / REV" }, { key: "seal", label: "N° plomb" },
];
const ROUND_COLS: Column[] = [{ key: "start", label: "Début ronde", type: "time" }, { key: "end", label: "Fin ronde", type: "time" }, { key: "observations", label: "Observations" }];
const ANOMALY_COLS: Column[] = [{ key: "dateTime", label: "Date et heure", type: "datetime-local" }, { key: "truck", label: "N° camion" }, { key: "transporter", label: "Transporteur / client" }, { key: "document", label: "Titre / facture / REV" }, { key: "broken", label: "Cassé" }, { key: "missing", label: "Manquant" }, { key: "empty", label: "Vides" }, { key: "phn", label: "PHN" }, { key: "facts", label: "Faits" }];
const PROCEDURE_COLS: Column[] = [{ key: "time", label: "Heure", type: "time" }, { key: "person", label: "Nom et prénom" }, { key: "staffType", label: "STAR / NON STAR", options: ["STAR", "NON STAR"] }, { key: "company", label: "Société" }, { key: "observations", label: "Infraction / circonstances" }, { key: "measures", label: "Mesures prises" }];
const OTHER_COLS: Column[] = [{ key: "dateTime", label: "Date et heure", type: "datetime-local" }, { key: "who", label: "Qui" }, { key: "what", label: "Quoi" }, { key: "where", label: "Où" }, { key: "how", label: "Comment" }, { key: "why", label: "Pourquoi" }, { key: "measures", label: "Mesures prises" }];
const VIGILANCE = ["Groupe électrogène · fermeture", "Éclairage extérieur", "Murs de clôture", "Barbelés", "Bureaux · portes et fenêtres", "Magasins · portails et cadenas", "Locaux techniques", "Véhicules · portières et vitres", "Véhicules · roue de secours et batterie", "Véhicules · feux et rétroviseurs", "Véhicules · réservoir", "Véhicules · carrosserie", "Motos · top case", "Cales de roue des camions"];
const EMPTY_PRODUCTS = ["C12/100", "C24/30", "C20/65", "C20/50", "C24/33", "CV12", "CV20", "CV24", "CV16", "Intercal plastiques"];
const FULL_PRODUCTS = ["EV 50 P12", "EV 150 P6", "CR 100 P8", "CR 200 P6"];
const makeRows = (n: number, columns: Column[]): Row[] => Array.from({ length: n }, () => Object.fromEntries(columns.map((col) => [col.key, ""])));
const makeVigilance = () => VIGILANCE.map((label) => ({ label, status: "À contrôler", observation: "" }));
function fresh() {
  return {
    siteType: "USINE" as "USINE" | "AGENCE", siteName: "", providerName: "", reportDate: today(), startTime: "06:00", endTime: "18:00", postName: "Poste principal", observations: "",
    dayAgents: makeRows(1, [{ key: "name", label: "Nom" }, { key: "matricule", label: "Matricule" }, { key: "post", label: "Poste" }]),
    nightAgents: makeRows(1, [{ key: "name", label: "Nom" }, { key: "matricule", label: "Matricule" }, { key: "post", label: "Poste" }]),
    keyTransfers: makeRows(1, KEY_COLS), unloading: makeRows(1, TRUCK_COLS), loading: makeRows(1, TRUCK_COLS),
    breathTests: makeRows(1, [{ key: "time", label: "Heure" }, { key: "person", label: "Personne" }, { key: "staffType", label: "Appartenance" }, { key: "requester", label: "Demandeur" }, { key: "requestType", label: "Type de demande" }, { key: "result", label: "Résultat" }]),
    rounds: makeRows(1, ROUND_COLS), vigilance: makeVigilance(), anomalies: makeRows(1, ANOMALY_COLS), violations: makeRows(1, PROCEDURE_COLS), miscellaneous: makeRows(1, OTHER_COLS),
    stockEmpty: EMPTY_PRODUCTS.map((product) => ({ product, quantity: "" })), stockFull: FULL_PRODUCTS.map((product) => ({ product, quantity: "" })),
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-lg border p-4"><h2 className="text-base font-semibold">{title}</h2>{children}</section>;
}
function RowsEditor({ title, columns, rows, onChange }: { title: string; columns: Column[]; rows: Row[]; onChange: (rows: Row[]) => void }) {
  const setCell = (index: number, key: string, value: string) => onChange(rows.map((row, i) => i === index ? { ...row, [key]: value } : row));
  return <div className="space-y-3">
    <div className="flex items-center justify-between"><h3 className="text-sm font-medium">{title}</h3><Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, Object.fromEntries(columns.map((col) => [col.key, ""]))])}><Plus className="mr-1 h-4 w-4" />Ajouter</Button></div>
    {rows.map((row, index) => <div key={index} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2 xl:grid-cols-3">
      {columns.map((col) => <div key={col.key}><Label htmlFor={`${title}-${index}-${col.key}`} className="text-xs">{col.label}</Label>{col.options
        ? <select id={`${title}-${index}-${col.key}`} value={row[col.key] || ""} onChange={(e) => setCell(index, col.key, e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Choisir…</option>{col.options.map((option) => <option key={option}>{option}</option>)}</select>
        : <Input id={`${title}-${index}-${col.key}`} type={col.type || "text"} value={row[col.key] || ""} onChange={(e) => setCell(index, col.key, e.target.value)} />}</div>)}
      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onChange(rows.filter((_, i) => i !== index))}><Trash2 className="mr-1 h-4 w-4" />Supprimer</Button>
    </div>)}
  </div>;
}

export default function FormCompteRendu({ existingReport, onSaved }: { existingReport?: any; onSaved?: (report: any) => void }) {
  const { sites, canCreateSite, addSite, siteError } = useSites();
  const [form, setForm] = useState<any>(fresh);
  const [saving, setSaving] = useState(false);
  const [importingRounds, setImportingRounds] = useState(false);
  const [status, setStatus] = useState("BROUILLON");
  useEffect(() => {
    if (!existingReport) { setForm(fresh()); setStatus("BROUILLON"); return; }
    const base = fresh();
    setForm({ ...base, ...existingReport, ...(existingReport.details || {}), siteType: existingReport.siteType || "USINE",
      dayAgents: (existingReport.agents || []).filter((a: any) => a.shift === "JOUR").map((a: any) => ({ name: a.name || "", matricule: a.matricule || "", post: a.post || "" })).concat(makeRows(1, fields(["name", "matricule", "post"]))),
      nightAgents: (existingReport.agents || []).filter((a: any) => a.shift === "NUIT").map((a: any) => ({ name: a.name || "", matricule: a.matricule || "", post: a.post || "" })).concat(makeRows(1, fields(["name", "matricule", "post"]))),
    });
    setStatus(existingReport.statut || "BROUILLON");
  }, [existingReport]);
  const setRows = (key: string, rows: Row[]) => setForm((old: any) => ({ ...old, [key]: rows }));
  const setField = (key: string, value: string) => setForm((old: any) => ({ ...old, [key]: value }));
  const selectedSite = sites.find((site) => site.name === form.siteName);
  const siteProps = { id: "report-site", value: form.siteName, type: form.siteType, sites, canCreate: canCreateSite, onAdd: addSite, onChange: (name: string, type: "USINE" | "AGENCE") => setForm((old: any) => ({ ...old, siteName: name, siteType: type })) };
  const importRounds = async () => {
    setImportingRounds(true);
    try {
      const rows = await serviceApi.listPatrols();
      const date = form.reportDate;
      const matches = rows.filter((row: any) => row.site_id === selectedSite?.id && String(row.started_at).slice(0, 10) === date && row.ended_at);
      if (!matches.length) { toast.message("Aucune ronde clôturée pour ce site et cette date."); return; }
      setRows("rounds", matches.map((row: any) => ({ start: new Date(row.started_at).toTimeString().slice(0, 5), end: new Date(row.ended_at).toTimeString().slice(0, 5), observations: row.anomalies || "" })));
      toast.success("Rondes importées dans le rapport.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Import des rondes impossible."); }
    finally { setImportingRounds(false); }
  };
  const save = async (submit = false) => {
    const agents = [...form.dayAgents.map((a: Row) => ({ ...a, shift: "JOUR" })), ...form.nightAgents.map((a: Row) => ({ ...a, shift: "NUIT" }))].filter((a: any) => a.name.trim() || a.matricule.trim());
    if (agents.some((a: any) => !a.name.trim() || !a.matricule.trim() || !a.post.trim())) { toast.error("Chaque agent doit avoir un nom, un matricule et un poste."); return; }
    setSaving(true);
    try {
      const details = { keyTransfers: form.keyTransfers, unloading: form.unloading, loading: form.loading, breathTests: form.breathTests.filter((r: Row) => !(r.requestType?.includes("ordinaire") && r.result === "Négatif")), rounds: form.rounds, vigilance: form.vigilance, anomalies: form.anomalies, violations: form.violations, miscellaneous: form.miscellaneous, stockEmpty: form.stockEmpty, stockFull: form.stockFull };
      const payload = { siteType: form.siteType, siteName: form.siteName, providerName: form.providerName, reportDate: form.reportDate, startTime: form.startTime, endTime: form.endTime, postName: form.postName, observations: form.observations, agents, details };
      let report = existingReport?.id ? await serviceApi.updateReport(existingReport.id, payload) : await serviceApi.createReport(payload);
      if (submit && report.id) { await serviceApi.submitReport(report.id); report = { ...report, statut: "ENVOYE" }; setStatus("ENVOYE"); }
      onSaved?.(report); toast.success(submit ? "Rapport envoyé et verrouillé." : "Brouillon enregistré.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Enregistrement du rapport impossible."); }
    finally { setSaving(false); }
  };
  const field = (key: string, label: string, type = "text") => <div><Label htmlFor={key}>{label}</Label><Input id={key} type={type} value={form[key]} onChange={(e) => setField(key, e.target.value)} /></div>;
  return <Panel title="Rapport journalier · modèles Usine et Agence">
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void save(false); }}>
      <fieldset disabled={saving || status === "ENVOYE"} className="space-y-5">
        <Section title="En-tête">
          <div className="grid gap-3 sm:grid-cols-2">{field("providerName", "Prestataire")}{field("siteName", "Site")}{field("reportDate", "Date", "date")}{field("postName", "Poste")}{field("startTime", "Début de service", "time")}{field("endTime", "Fin de service", "time")}
            <div><Label htmlFor="siteType">Modèle</Label><select id="siteType" value={form.siteType} onChange={(e) => setField("siteType", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="USINE">Usine</option><option value="AGENCE">Agence</option></select></div>
          </div>
        </Section>
        {siteError && <p className="text-sm text-destructive">{siteError}</p>}
        <div className="max-w-xl"><SitePicker {...siteProps} /></div>
        <Section title="1 · Agents"><RowsEditor title="Vacation jour" columns={[{ key: "name", label: "Nom complet" }, { key: "matricule", label: "Matricule" }, { key: "post", label: "Poste" }]} rows={form.dayAgents} onChange={(r) => setRows("dayAgents", r)} /><RowsEditor title="Vacation nuit" columns={[{ key: "name", label: "Nom complet" }, { key: "matricule", label: "Matricule" }, { key: "post", label: "Poste" }]} rows={form.nightAgents} onChange={(r) => setRows("nightAgents", r)} /></Section>
        <Section title="2 · Clés"><RowsEditor title="Perception et réintégration des clés" columns={KEY_COLS} rows={form.keyTransfers} onChange={(r) => setRows("keyTransfers", r)} /></Section>
        <Section title="3 · Déchargement"><RowsEditor title="Véhicules reçus" columns={TRUCK_COLS} rows={form.unloading} onChange={(r) => setRows("unloading", r)} /></Section>
        <Section title="4 · Chargement"><RowsEditor title="Véhicules chargés" columns={TRUCK_COLS} rows={form.loading} onChange={(r) => setRows("loading", r)} /></Section>
        {form.siteType === "AGENCE" && <Section title="5 · Inventaire extérieur"><div className="grid gap-5 md:grid-cols-2">{[["Vides", "stockEmpty"], ["Pleins / eaux", "stockFull"]].map(([title, key]) => <div key={key} className="space-y-2"><h3 className="text-sm font-medium">{title}</h3>{form[key].map((item: any, i: number) => <div key={i} className="grid grid-cols-[1fr_120px] gap-2"><Label>{item.product}</Label><Input type="number" min="0" value={item.quantity} onChange={(e) => setForm((old: any) => ({ ...old, [key]: old[key].map((row: any, n: number) => n === i ? { ...row, quantity: e.target.value } : row) }))} /></div>)}</div>)}</div></Section>}
        <Section title={form.siteType === "AGENCE" ? "6 · Alcootests" : "5 · Alcootests"}><RowsEditor title="Contrôles" columns={[{ key: "time", label: "Heure", type: "time" }, { key: "person", label: "Personne" }, { key: "staffType", label: "STAR / NON STAR", options: ["STAR", "NON STAR"] }, { key: "requester", label: "Demandeur" }, { key: "requestType", label: "Type de demande", options: ["Test ordinaire (Entrée/Sortie)", "À la demande d'un service"] }, { key: "result", label: "Résultat", options: ["Positif", "Négatif"] }]} rows={form.breathTests} onChange={(r) => setRows("breathTests", r)} /></Section>
        <Section title={form.siteType === "AGENCE" ? "7 · Patrouilles et rondes" : "6 · Patrouilles et rondes"}><Button type="button" variant="outline" size="sm" onClick={() => void importRounds()} disabled={importingRounds}>{importingRounds ? "Importation…" : "Importer les rondes clôturées"}</Button><RowsEditor title="Rondes" columns={ROUND_COLS} rows={form.rounds} onChange={(r) => setRows("rounds", r)} /></Section>
        <Section title={form.siteType === "AGENCE" ? "8 · Points de vigilance" : "7 · Points de vigilance"}><div className="grid gap-3 sm:grid-cols-2">{form.vigilance.map((item: any, i: number) => <div key={item.label} className="space-y-2 rounded border p-3"><Label>{item.label}</Label><select value={item.status} onChange={(e) => setForm((old: any) => ({ ...old, vigilance: old.vigilance.map((row: any, n: number) => n === i ? { ...row, status: e.target.value } : row) }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option>À contrôler</option><option>Conforme</option><option>Anomalie</option><option>Sans objet</option></select><Input placeholder="Observation" value={item.observation} onChange={(e) => setForm((old: any) => ({ ...old, vigilance: old.vigilance.map((row: any, n: number) => n === i ? { ...row, observation: e.target.value } : row) }))} /></div>)}</div></Section>
        <Section title={form.siteType === "AGENCE" ? "9 · Anomalies" : "8 · Anomalies"}><RowsEditor title="Anomalies" columns={ANOMALY_COLS} rows={form.anomalies} onChange={(r) => setRows("anomalies", r)} /></Section>
        <Section title={form.siteType === "AGENCE" ? "10 · Violations de procédure" : "9 · Violations de procédure"}><RowsEditor title="Violations" columns={PROCEDURE_COLS} rows={form.violations} onChange={(r) => setRows("violations", r)} /></Section>
        <Section title={form.siteType === "AGENCE" ? "11 · Divers" : "10 · Divers"}><RowsEditor title="Divers" columns={OTHER_COLS} rows={form.miscellaneous} onChange={(r) => setRows("miscellaneous", r)} /></Section>
        <Section title="Observations générales"><Textarea rows={4} value={form.observations} onChange={(e) => setField("observations", e.target.value)} /></Section>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={saving || status === "ENVOYE"}>Enregistrer le brouillon</Button><Button type="button" variant="outline" onClick={() => void save(true)} disabled={saving || status === "ENVOYE"}><Send className="mr-2 h-4 w-4" />Envoyer et verrouiller</Button></div>
      </fieldset>
    </form>
  </Panel>;
}
