import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { useSites } from "@/hooks/useSites";
import { useDemoTable } from "@/lib/demo-store";
import { serviceApi } from "@/lib/service-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BadgeListPanel from "./BadgeListPanel";
import BadgeScannerPanel from "./BadgeScannerPanel";
import { toast } from "sonner";

type Tab = "badges" | "keys" | "alcohol";
const today = () => new Date().toLocaleDateString("en-CA");
const timeNow = () => new Date().toTimeString().slice(0, 5);
const emptyKey = () => ({ date: today(), lieu: "", perceptionMatin: "", responsablePerceptionMatin: "", reintegrationMatin: "", responsableReintegrationMatin: "", perceptionApresMidi: "", responsablePerceptionApresMidi: "", reintegrationApresMidi: "", responsableReintegrationApresMidi: "", observations: "" });
const emptyBreath = () => ({ date: today(), heure: timeNow(), personne: "", appartenance: "STAR", demandeur: "", typeDemande: "Test ordinaire (Entrée/Sortie)", resultat: "Négatif", tauxMesure: "" });

export default function ControleAcces() {
  const badges = useDemoTable("badges");
  const { sites, canCreateSite, addSite, siteError } = useSites();
  const [tab, setTab] = useState<Tab>("badges");
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [keys, setKeys] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [keyForm, setKeyForm] = useState(emptyKey);
  const [breathForm, setBreathForm] = useState(emptyBreath);
  const [saving, setSaving] = useState(false);
  const site = useMemo(() => sites.find((item) => item.name === siteName), [sites, siteName]);
  const refresh = async (siteId?: string) => {
    try { const [keyRows, testRows] = await Promise.all([serviceApi.listKeyTracking(siteId), serviceApi.listBreathTests(siteId)]); setKeys(keyRows); setTests(testRows); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Chargement des registres impossible"); }
  };
  useEffect(() => { void refresh(site?.id); }, [site?.id]);
  const siteProps = { id: "access-site", value: siteName, type: siteType, sites, canCreate: canCreateSite, onAdd: addSite, onChange: (name: string, type: "USINE" | "AGENCE") => { setSiteName(name); setSiteType(type); } };
  const saveKey = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { const row = await serviceApi.createKeyTracking({ ...keyForm, siteName, siteType }); setKeys((old) => [row, ...old]); setKeyForm(emptyKey()); toast.success("Mouvement des clés enregistré"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Enregistrement impossible"); }
    finally { setSaving(false); }
  };
  const saveBreath = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { const row = await serviceApi.createBreathTest({ ...breathForm, siteName, siteType }); setTests((old) => [row, ...old]); setBreathForm(emptyBreath()); toast.success("Contrôle enregistré"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Enregistrement impossible"); }
    finally { setSaving(false); }
  };
  const keyTimeFields: [keyof ReturnType<typeof emptyKey>, string][] = [
    ["perceptionMatin", "Perception matin · heure"], ["responsablePerceptionMatin", "Responsable"],
    ["reintegrationMatin", "Réintégration matin · heure"], ["responsableReintegrationMatin", "Responsable"],
    ["perceptionApresMidi", "Perception après-midi · heure"], ["responsablePerceptionApresMidi", "Responsable"],
    ["reintegrationApresMidi", "Réintégration après-midi · heure"], ["responsableReintegrationApresMidi", "Responsable"],
  ];
  const updateKey = (key: keyof ReturnType<typeof emptyKey>, value: string) => setKeyForm((old) => ({ ...old, [key]: value }));
  return <div>
    <PageHeader title="Contrôle d’accès" subtitle="Badges, clés et contrôles d’alcoolémie" />
    <div className="mb-5 max-w-xl"><SitePicker {...siteProps} /></div>
    {siteError && <p className="mb-4 text-sm text-destructive">{siteError}</p>}
    <div className="mb-5 flex flex-wrap gap-2 border-b pb-3" role="tablist" aria-label="Registres de contrôle d’accès">
      {([["badges", "Badges"], ["keys", "Suivi des clés"], ["alcohol", "Alcootests"]] as const).map(([value, label]) => <Button key={value} role="tab" aria-selected={tab === value} variant={tab === value ? "default" : "secondary"} onClick={() => setTab(value)}>{label}</Button>)}
    </div>
    {tab === "badges" ? <div className="grid gap-7 xl:grid-cols-[340px_1fr]"><Panel title="Badges et autorisations"><BadgeScannerPanel rows={badges} /></Panel><Panel title="Badges du site"><BadgeListPanel rows={badges} /></Panel></div> : tab === "keys" ? <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.75fr)_minmax(500px,1.4fr)]">
      <Panel title="Suivi des clés"><form className="space-y-4" onSubmit={(e) => void saveKey(e)}><div><Label htmlFor="key-date">Date</Label><Input id="key-date" type="date" required value={keyForm.date} onChange={(e) => setKeyForm({ ...keyForm, date: e.target.value })} /></div><div><Label htmlFor="key-place">Lieu / clé concernée</Label><Input id="key-place" required value={keyForm.lieu} onChange={(e) => setKeyForm({ ...keyForm, lieu: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2">{keyTimeFields.map(([key, label]) => <div key={key}><Label htmlFor={key}>{label}</Label><Input id={key} type={String(key).toLowerCase().includes("responsable") ? "text" : "time"} value={keyForm[key]} onChange={(e) => updateKey(key, e.target.value)} /></div>)}</div><div><Label htmlFor="key-notes">Observations</Label><Input id="key-notes" value={keyForm.observations} onChange={(e) => setKeyForm({ ...keyForm, observations: e.target.value })} /></div><Button className="w-full" disabled={saving || (!site && !siteName.trim())}>Enregistrer le suivi</Button></form></Panel>
      <Panel title="Registre des clés"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="border-b"><tr>{["Date", "Lieu", "Perception matin", "Réintégration matin", "Perception après-midi", "Réintégration après-midi", "Site"].map((x) => <th key={x} className="py-3 pr-3">{x}</th>)}</tr></thead><tbody className="divide-y">{keys.map((row) => <tr key={row.id}><td className="py-3 pr-3">{String(row.date).slice(0, 10)}</td><td className="pr-3">{row.lieu}</td><td className="pr-3">{row.perceptionMatin} · {row.responsablePerceptionMatin}</td><td className="pr-3">{row.reintegrationMatin} · {row.responsableReintegrationMatin}</td><td className="pr-3">{row.perceptionApresMidi} · {row.responsablePerceptionApresMidi}</td><td className="pr-3">{row.reintegrationApresMidi} · {row.responsableReintegrationApresMidi}</td><td>{row.siteName}</td></tr>)}</tbody></table>{!keys.length && <p className="py-8 text-center text-sm text-muted-foreground">Aucun mouvement enregistré.</p>}</div></Panel>
    </div> : <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.75fr)_minmax(500px,1.4fr)]">
      <Panel title="Enregistrer un alcootest"><form className="space-y-4" onSubmit={(e) => void saveBreath(e)}><div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="breath-date">Date</Label><Input id="breath-date" type="date" required value={breathForm.date} onChange={(e) => setBreathForm({ ...breathForm, date: e.target.value })} /></div><div><Label htmlFor="breath-time">Heure</Label><Input id="breath-time" type="time" required value={breathForm.heure} onChange={(e) => setBreathForm({ ...breathForm, heure: e.target.value })} /></div><div><Label htmlFor="breath-person">Nom complet</Label><Input id="breath-person" required value={breathForm.personne} onChange={(e) => setBreathForm({ ...breathForm, personne: e.target.value })} /></div><div><Label htmlFor="breath-affiliation">Appartenance</Label><select id="breath-affiliation" value={breathForm.appartenance} onChange={(e) => setBreathForm({ ...breathForm, appartenance: e.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option>STAR</option><option>NON STAR</option></select></div><div><Label htmlFor="breath-requester">Demandeur</Label><Input id="breath-requester" value={breathForm.demandeur} onChange={(e) => setBreathForm({ ...breathForm, demandeur: e.target.value })} /></div><div><Label htmlFor="breath-type">Type de demande</Label><select id="breath-type" value={breathForm.typeDemande} onChange={(e) => setBreathForm({ ...breathForm, typeDemande: e.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option>Test ordinaire (Entrée/Sortie)</option><option>À la demande d'un service</option></select></div><div><Label htmlFor="breath-result">Résultat</Label><select id="breath-result" value={breathForm.resultat} onChange={(e) => setBreathForm({ ...breathForm, resultat: e.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option>Positif</option><option>Négatif</option></select></div><div><Label htmlFor="breath-rate">Taux mesuré</Label><Input id="breath-rate" type="number" min="0" step="0.01" value={breathForm.tauxMesure} onChange={(e) => setBreathForm({ ...breathForm, tauxMesure: e.target.value })} /></div></div><Button className="w-full" disabled={saving || (!site && !siteName.trim())}>Enregistrer le contrôle</Button></form></Panel>
      <Panel title="Registre des alcootests"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="border-b"><tr>{["Date / heure", "Personne", "Appartenance", "Demandeur", "Type", "Résultat", "Taux", "Site"].map((x) => <th key={x} className="py-3 pr-3">{x}</th>)}</tr></thead><tbody className="divide-y">{tests.map((row) => <tr key={row.id}><td className="py-3 pr-3">{String(row.date).slice(0, 10)} · {row.heure}</td><td className="pr-3">{row.personne}</td><td className="pr-3">{row.appartenance}</td><td className="pr-3">{row.demandeur || "—"}</td><td className="pr-3">{row.typeDemande}</td><td className="pr-3">{row.resultat}</td><td className="pr-3">{row.tauxMesure ?? "—"}</td><td>{row.siteName}</td></tr>)}</tbody></table>{!tests.length && <p className="py-8 text-center text-sm text-muted-foreground">Aucun contrôle enregistré.</p>}</div></Panel>
    </div>}
  </div>;
}
