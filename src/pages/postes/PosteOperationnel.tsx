import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ClipboardList, FileText, Handshake, Phone, ShieldAlert, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { SIDEBAR_GROUPS } from "@/pages/layouts/navigation";
import type { EmergencyContact } from "@/lib/service-api";

type Shift = { id: string; serviceId?: string; posteId?: string; posteNom?: string; nom: string; prenom: string; matricule: string; shiftType?: string; fonctionService?: string; ended_at?: string | null };
type Instruction = { id: string; date: string; dateFin?: string | null; jusquauNouvelOrdre?: boolean; consigne: string; emetteur?: string; tousPostes?: boolean; posteId?: string | null; posteIds?: string[]; lectures?: { posteId: string; posteNom?: string; readAt?: string | null }[] };
const bookItems = SIDEBAR_GROUPS.flatMap((group) => group.items).filter((item) => item.to.startsWith("/dashboard/") && !["/dashboard", "/dashboard/postes", "/dashboard/prestataires", "/dashboard/statistiques", "/dashboard/administration", "/dashboard/employes", "/dashboard/documents", "/dashboard/cameras", "/dashboard/comptes-rendus"].includes(item.to));

function instructionIsActive(entry: Instruction) {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Indian/Antananarivo" });
  return String(entry.date || "").slice(0, 10) <= today && (entry.jusquauNouvelOrdre || String(entry.dateFin || entry.date).slice(0, 10) >= today);
}

export default function PosteOperationnel() {
  const { posteId = "" } = useParams();
  const location = useLocation();
  const { sites } = useSites();
  const routeState = location.state as { siteId?: string; posteNom?: string } | null;
  const siteId = routeState?.siteId || sites[0]?.id || "";
  const [posts, setPosts] = useState<{ id: string; nom: string }[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [siteBans, setSiteBans] = useState<{ id: string; full_name: string }[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (siteId && posteId) localStorage.setItem(`securitec-active-post:${siteId}`, posteId);
  }, [siteId, posteId]);

  useEffect(() => {
    setPosts([]); setShifts([]); setInstructions([]); setSiteBans([]); setEmergencyContacts([]); setError("");
    if (!siteId) return;
    let active = true;
    Promise.allSettled([serviceApi.listShiftPosts(siteId), serviceApi.listShifts(siteId), serviceApi.listJournalConsignes(siteId, true), serviceApi.listVisitors(siteId), serviceApi.listEmergencyContacts(siteId)])
      .then(([postResult, shiftResult, instructionResult, visitorResult, emergencyResult]) => { if (active) {
        if (postResult.status === "fulfilled") setPosts(postResult.value);
        if (shiftResult.status === "fulfilled") setShifts(shiftResult.value);
        if (instructionResult.status === "fulfilled") setInstructions(instructionResult.value);
        if (visitorResult.status === "fulfilled") {
          const banned = visitorResult.value.filter((visitor) => visitor.site_banned);
          setSiteBans([...new Map(banned.map((visitor) => [visitor.full_name.trim().toLocaleLowerCase("fr"), { id: visitor.id, full_name: visitor.full_name }])).values()]);
        }
        if (emergencyResult.status === "fulfilled") setEmergencyContacts(emergencyResult.value);
        const failures = [postResult, shiftResult, instructionResult, visitorResult, emergencyResult].filter((result) => result.status === "rejected");
        if (failures.length) setError("Certaines informations du poste n’ont pas pu être chargées.");
      } })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Chargement du poste impossible."); });
    return () => { active = false; };
  }, [siteId]);

  const post = posts.find((item) => item.id === posteId);
  const crew = useMemo(() => shifts.filter((shift) => !shift.ended_at && shift.posteId === posteId), [shifts, posteId]);
  const heading = post?.nom || routeState?.posteNom || "Poste de garde";
  const currentInstructions = instructions.filter((entry) => instructionIsActive(entry)
    && (entry.tousPostes || (!entry.posteIds?.length && !entry.posteId) || entry.posteIds?.includes(posteId) || entry.posteId === posteId));
  const acknowledgeInstruction = async (entry: Instruction) => {
    if (!siteId) return;
    setAcknowledging(entry.id);
    try {
      const receipt = await serviceApi.acknowledgeJournalConsigne(entry.id, siteId, posteId);
      setInstructions((current) => current.map((item) => item.id !== entry.id ? item : {
        ...item,
        lectures: (item.lectures || []).map((row) => row.posteId === posteId ? { ...row, readAt: receipt.readAt } : row),
      }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Impossible de confirmer la lecture."); }
    finally { setAcknowledging(null); }
  };
  const operationalLinks = [
    { to: "/dashboard/prise-de-poste", label: "Prise de service", description: "Ouvrir ou clôturer le service jour/nuit et déclarer l’équipe.", icon: Users },
    { to: "/dashboard/main-courante", label: "Main courante", description: "Consigner les événements, incidents, anomalies et mesures prises.", icon: FileText },
    { to: "/dashboard/consigne", label: "Consignes et alertes", description: "Lire les consignes actives et suivre les alertes du site.", icon: ShieldAlert },
    { to: "/dashboard/passation", label: "Passation", description: "Transmettre inventaire, pièces, courriers et consignes à la relève.", icon: Handshake },
  ];

  return <div className="space-y-6">
    <Link to="/dashboard/postes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Tous les postes</Link>
    <PageHeader title={heading} subtitle="Espace opérationnel du poste : service en cours, consignes et cahiers." />
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    <section aria-label="Alertes et consignes" className={`space-y-3 rounded-xl border p-4 ${currentInstructions.length || siteBans.length ? "border-warning/40 bg-warning/5" : "bg-card"}`}>
      <div className="flex items-center gap-2"><AlertTriangle className="size-5 text-warning-foreground" /><h2 className="font-semibold">Alertes et consignes à consulter</h2></div>
      {currentInstructions.map((entry) => {
        const receipt = entry.lectures?.find((item) => item.posteId === posteId);
        return <article key={entry.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-background p-3">
          <div className="min-w-0 flex-1"><p className="whitespace-pre-wrap text-sm font-medium">{entry.consigne}</p><p className="mt-1 text-xs text-muted-foreground">Émise par {entry.emetteur || "Responsable"} · {entry.jusquauNouvelOrdre ? "Jusqu’à nouvel ordre" : `Valable jusqu’au ${String(entry.dateFin || entry.date).slice(0, 10)}`}</p></div>
          {receipt?.readAt ? <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="size-4" />Lue</span> : <Button size="sm" variant="outline" onClick={() => void acknowledgeInstruction(entry)} disabled={acknowledging === entry.id}>{acknowledging === entry.id ? "Enregistrement…" : "Confirmer la lecture"}</Button>}
        </article>;
      })}
      {siteBans.length > 0 && <article className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"><div className="flex items-center gap-2 text-sm font-semibold text-destructive"><ShieldAlert className="size-4" />Interdictions de site à vérifier au contrôle d’entrée</div><p className="mt-2 text-xs">{siteBans.map((person) => person.full_name).join(" · ")}</p></article>}
      {!currentInstructions.length && !siteBans.length && <p className="text-sm text-muted-foreground">Aucune consigne active ni interdiction de site enregistrée.</p>}
    </section>
    <section className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Service actif</h2><p className="mt-1 text-sm text-muted-foreground">{crew.length ? `Service ${crew[0].shiftType === "NUIT" ? "de nuit" : "de jour"} · ouvert` : "Aucun service ouvert pour ce poste."}</p></div><Button asChild><Link to="/dashboard/prise-de-poste">{crew.length ? "Gérer le service" : "Ouvrir le service"}<ArrowRight className="ml-2 size-4" /></Link></Button></div>
      {crew.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{crew.map((agent) => <span key={agent.id} className="rounded-full bg-muted px-3 py-1 text-xs">{agent.fonctionService === "CHEF" ? "Chef · " : ""}{agent.prenom} {agent.nom} · {agent.matricule}</span>)}</div>}
    </section>
    <section><h2 className="mb-3 text-lg font-semibold">Circuits du poste</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{operationalLinks.map(({ to, label, description, icon: Icon }) => <Link key={to} to={to} state={{ siteId, posteId, posteNom: heading }} className="rounded-xl border bg-card p-4 transition hover:border-primary/50 hover:shadow-sm"><Icon className="size-5 text-primary" /><h3 className="mt-3 font-semibold">{label}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></Link>)}</div></section>
    <section><div className="mb-3 flex items-center gap-2"><BookOpen className="size-5 text-primary" /><h2 className="text-lg font-semibold">Cahiers d’enregistrement</h2></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{bookItems.map((item) => <Link key={item.to} to={item.to} state={{ siteId, posteId, posteNom: heading }} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm hover:border-primary/50"><ClipboardList className="size-4 shrink-0 text-muted-foreground" /><span className="flex-1">{item.label}</span><ArrowRight className="size-4 text-muted-foreground" /></Link>)}</div></section>
    <section className="rounded-xl border border-dashed p-4"><div className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Prestataires et personnes autorisées</h2></div><p className="mt-1 text-sm text-muted-foreground">Consultez les fiches entreprises, les personnes et véhicules associés aux prestataires, ainsi que les contrôles d’accès.</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" size="sm" asChild><Link to="/dashboard/prestataires" state={{ siteId, posteId, posteNom: heading }}>Fiches prestataires</Link></Button><Button variant="outline" size="sm" asChild><Link to="/dashboard/chauffeurs" state={{ siteId, posteId, posteNom: heading }}>Chauffeurs</Link></Button><Button variant="outline" size="sm" asChild><Link to="/dashboard/visiteurs" state={{ siteId, posteId, posteNom: heading }}>Visiteurs et accès</Link></Button><Button variant="outline" size="sm" asChild><Link to="/dashboard/materiels-sous-traitant" state={{ siteId, posteId, posteNom: heading }}>Matériels sous-traitants</Link></Button></div></section>
    <section className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2"><Phone className="size-4 text-primary" /><h2 className="text-sm font-semibold">Contacts d’urgence</h2></div>
      {emergencyContacts.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{emergencyContacts.map((contact) => <article key={contact.id} className="rounded-lg border p-3"><p className="font-medium">{contact.nom}</p><p className="text-xs text-muted-foreground">{contact.fonction}</p><a className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" href={`tel:${contact.telephone.replace(/[^+\d]/g, "")}`}><Phone className="size-3.5" />{contact.telephone}</a>{contact.email && <p className="mt-1 text-xs"><a className="text-primary hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a></p>}{contact.instructions && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{contact.instructions}</p>}</article>)}</div> : <p className="mt-2 text-sm text-muted-foreground">Aucun contact d’urgence n’a été configuré pour ce site.</p>}
      <Button className="mt-3" variant="outline" size="sm" asChild><Link to="/dashboard/administration">Gérer les contacts</Link></Button>
    </section>
  </div>;
}
