import { PageHeader } from "@/components/PageHeader";
import { CalendarDays, Printer, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";

type Agent = { nom: string; prenom: string; matricule: string; heureEntree: string; heureSortie: string; observation: string };
type Poste = { name: string; count: number };

const postesJour: Poste[] = [
  { name: "PG1", count: 5 }, { name: "EXP", count: 2 }, { name: "BOX", count: 1 },
  { name: "EX GARAGE", count: 1 }, { name: "MG/HV", count: 1 }, { name: "TDE", count: 1 },
  { name: "BON ESPOIR", count: 2 }, { name: "CO2", count: 1 }, { name: "PG2", count: 2 },
  { name: "PBM", count: 1 }, { name: "PBS", count: 1 }, { name: "PARKING EXTERIEUR", count: 1 },
  { name: "MATERIEL", count: 1 }, { name: "FITAVA", count: 1 }, { name: "VILLA G", count: 1 },
];
const postesNuit: Poste[] = [
  { name: "PG1", count: 2 }, { name: "EXP", count: 1 }, { name: "BOX", count: 1 },
  { name: "EX GARAGE", count: 1 }, { name: "MG/HV", count: 1 }, { name: "TDE", count: 1 },
  { name: "BON ESPOIR", count: 3 }, { name: "CO2", count: 1 }, { name: "PG2", count: 2 },
  { name: "MATO", count: 2 }, { name: "FITAVA", count: 1 }, { name: "VILLA G", count: 1 },
];

const blankAgent = (): Agent => ({ nom: "", prenom: "", matricule: "", heureEntree: "", heureSortie: "", observation: "" });
const normalizeAgents = (data: Record<string, Agent[]>, initial: Record<string, Agent[]>, service: "jour" | "nuit") => {
  const normalized = Object.fromEntries(Object.keys(initial).map((poste) => [poste, data[poste] ?? initial[poste]])) as Record<string, Agent[]>;
  if (service === "jour") {
    normalized["EX GARAGE"] = data["EX GARAGE"] ?? data.GARAGE ?? initial["EX GARAGE"];
    normalized.PG2 = data.PG2 ?? data.PGIT ?? initial.PG2;
    normalized.FITAVA = data.FITAVA ?? data.FITAA ?? initial.FITAVA;
    normalized["PARKING EXTERIEUR"] = data["PARKING EXTERIEUR"] ?? data.EXTERIEUR ?? initial["PARKING EXTERIEUR"];
  }
  return normalized;
};
const storageKey = (date: string, service: "jour" | "nuit", siteId: string) => `pointage-aps-${siteId}-${service}-${date}`;

export default function PointageAPS() {
  const { sites, siteError } = useSites();
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [siteId, setSiteId] = useState("");
  const [service, setService] = useState<"jour" | "nuit">("jour");
  const [agentsByKey, setAgentsByKey] = useState<Record<string, Record<string, Agent[]>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const postes = service === "jour" ? postesJour : postesNuit;
  const initial = useMemo(() => Object.fromEntries(postes.map((poste) => [poste.name, Array.from({ length: poste.count }, blankAgent)])), [service]);
  const key = storageKey(date, service, siteId);
  const contextKey = `${siteId}:${key}`;
  const agents = agentsByKey[contextKey] ?? initial;

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites[0].id);
  }, [siteId, sites]);

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    setLoading(true);
    serviceApi.getApsAttendance(date, service, siteId)
      .then(({ data }) => {
        if (!active) return;
        if (data) setAgentsByKey((current) => ({ ...current, [contextKey]: normalizeAgents(data, initial, service) }));
        else {
          try {
            const saved = localStorage.getItem(key);
            const loaded = saved ? normalizeAgents(JSON.parse(saved), initial, service) : initial;
            setAgentsByKey((current) => ({ ...current, [contextKey]: loaded }));
          } catch { setAgentsByKey((current) => ({ ...current, [contextKey]: initial })); }
        }
      })
      .catch((error) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Chargement du pointage impossible.");
        setAgentsByKey((current) => ({ ...current, [contextKey]: initial }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date, service, siteId, initial, key, contextKey]);

  const update = (poste: string, index: number, key: keyof Agent, value: string) => {
    setAgentsByKey((current) => {
      const currentAgents = current[contextKey] ?? initial;
      return { ...current, [contextKey]: { ...currentAgents, [poste]: (currentAgents[poste] ?? []).map((agent, i) => i === index ? { ...agent, [key]: value } : agent) } };
    });
  };
  const save = async () => {
    if (!siteId) { toast.error("Selectionnez un site avant enregistrement."); return; }
    setSaving(true);
    try {
      await serviceApi.saveApsAttendance({ date, service, siteId, data: agents });
      localStorage.setItem(key, JSON.stringify(agents));
      toast.success(`Pointage ${service} enregistre dans la base de donnees.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement du pointage impossible.");
    } finally { setSaving(false); }
  };
  const reset = () => {
    if (window.confirm("Effacer les informations de pointage de cette date ?")) {
      setAgentsByKey((current) => ({ ...current, [contextKey]: initial }));
    }
  };

  const setAgentIdentity = (poste: string, index: number, identity: Pick<Agent, "nom" | "prenom">) => {
    setAgentsByKey((current) => {
      const currentAgents = current[contextKey] ?? initial;
      return {
        ...current,
        [contextKey]: {
          ...currentAgents,
          [poste]: (currentAgents[poste] ?? []).map((agent, i) => i === index ? { ...agent, ...identity } : agent),
        },
      };
    });
  };

  return <div className="space-y-5">
    <PageHeader title={`Pointage APS - service de ${service}`} subtitle="Feuille journaliere des agents par poste" />
    <div className="flex w-fit gap-1 rounded-lg border bg-muted/40 p-1 print:hidden" role="tablist" aria-label="Service de pointage">
      {(["jour", "nuit"] as const).map((item) => <button key={item} role="tab" aria-selected={service === item} onClick={() => setService(item)} className={`rounded-md px-5 py-2 text-sm font-medium capitalize transition-colors ${service === item ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background"}`}>{item}</button>)}
    </div>
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-xs">
          <label htmlFor="pointage-date" className="mb-1.5 block text-sm font-medium">Date du pointage</label>
          <div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><input id="pointage-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" /></div>
        </div>
        <div className="w-full max-w-xs">
          <label htmlFor="pointage-site" className="mb-1.5 block text-sm font-medium">Site</label>
          <select id="pointage-site" value={siteId} onChange={(event) => setSiteId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
            {!sites.length && <option value="">Aucun site disponible</option>}
            {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
          {siteError && <p className="mt-1 text-xs text-destructive">{siteError}</p>}
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button onClick={() => void save()} disabled={saving || loading || !siteId} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"><Save className="size-4" />{saving ? "Enregistrement..." : "Enregistrer"}</button>
          <button onClick={reset} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted"><RotateCcw className="size-4" /> Effacer la journee</button>
          <button onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90"><Printer className="size-4" /> Imprimer</button>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Cliquez sur Enregistrer pour sauvegarder les modifications dans la base de donnees.</p>
    </section>
    {loading && <p className="text-sm text-muted-foreground">Chargement du pointage enregistre...</p>}
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
        <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground"><tr>
          <th className="w-36 border-b px-4 py-3">Poste</th><th className="w-48 border-b px-4 py-3">Nom</th><th className="w-48 border-b px-4 py-3">Pr&#233;nom</th><th className="w-36 border-b px-4 py-3">Matricule</th><th className="w-36 border-b px-4 py-3">Heure d&#8217;entr&#233;e</th><th className="w-36 border-b px-4 py-3">Heure de sortie</th><th className="border-b px-4 py-3">Observation</th>
        </tr></thead>
        <tbody>{postes.map((poste) => (agents[poste.name] ?? Array.from({ length: poste.count }, blankAgent)).map((agent, index) => <tr key={`${poste.name}-${index}`} className="group hover:bg-muted/30">
          {index === 0 && <th rowSpan={(agents[poste.name] ?? []).length || poste.count} className="border-b bg-muted/20 px-4 py-3 align-top font-semibold">{poste.name}<span className="mt-1 block text-xs font-normal text-muted-foreground">{(agents[poste.name] ?? []).length || poste.count} {(agents[poste.name] ?? []).length === 1 ? "agent" : "agents"}</span></th>}
          <td className="border-b px-3 py-2"><input aria-label={`Nom ${poste.name} ${index + 1}`} value={agent.nom ?? ""} readOnly placeholder="Depuis matricule" className="h-9 w-full rounded-md border border-transparent bg-muted/30 px-2" /></td>
          <td className="border-b px-3 py-2"><input aria-label={`Prenom ${poste.name} ${index + 1}`} value={agent.prenom ?? ""} readOnly placeholder="Depuis matricule" className="h-9 w-full rounded-md border border-transparent bg-muted/30 px-2" /></td>
          <td className="border-b px-3 py-2"><MatriculeAgentInput
            poste={poste.name}
            index={index}
            value={agent.matricule ?? ""}
            onChange={(value) => {
              update(poste.name, index, "matricule", value);
              setAgentIdentity(poste.name, index, { nom: "", prenom: "" });
            }}
            onEmployeeFound={(identity) => setAgentIdentity(poste.name, index, identity)}
          /></td>
          <td className="border-b px-3 py-2"><input aria-label={`Heure entree ${poste.name} ${index + 1}`} type="time" value={agent.heureEntree ?? ""} onChange={(e) => update(poste.name, index, "heureEntree", e.target.value)} className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none focus:border-input focus:bg-background" /></td>
          <td className="border-b px-3 py-2"><input aria-label={`Heure sortie ${poste.name} ${index + 1}`} type="time" value={agent.heureSortie ?? ""} onChange={(e) => update(poste.name, index, "heureSortie", e.target.value)} className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none focus:border-input focus:bg-background" /></td>
          <td className="border-b px-3 py-2"><input aria-label={`Observation ${poste.name} ${index + 1}`} value={agent.observation} onChange={(e) => update(poste.name, index, "observation", e.target.value)} placeholder="Observation" className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none focus:border-input focus:bg-background" /></td>
        </tr>))}</tbody>
      </table>
    </div>
    <style>{`@media print { @page { size: landscape; margin: 12mm; } body { background: white !important; } button, .print\\:hidden { display: none !important; } input { border: 0 !important; } }`}</style>
  </div>;
}

function MatriculeAgentInput({
  poste,
  index,
  value,
  onChange,
  onEmployeeFound,
}: {
  poste: string;
  index: number;
  value: string;
  onChange: (value: string) => void;
  onEmployeeFound: (identity: Pick<Agent, "nom" | "prenom">) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "missing" | "error">("idle");
  const onEmployeeFoundRef = useRef(onEmployeeFound);
  const matricule = value.trim();

  useEffect(() => {
    onEmployeeFoundRef.current = onEmployeeFound;
  }, [onEmployeeFound]);

  useEffect(() => {
    if (!matricule) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus("loading");
      serviceApi.lookupEmployeeByMatricule(matricule, controller.signal)
        .then((employee) => {
          if (controller.signal.aborted) return;
          if (!employee) {
            onEmployeeFoundRef.current({ nom: "", prenom: "" });
            setStatus("missing");
            return;
          }
          onEmployeeFoundRef.current({ nom: employee.nom, prenom: employee.prenom });
          setStatus("found");
        })
        .catch(() => {
          if (!controller.signal.aborted) setStatus("error");
        });
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [matricule]);

  return (
    <div>
      <input
        aria-label={`Matricule ${poste} ${index + 1}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Saisir un matricule"
        className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none focus:border-input focus:bg-background"
      />
      {matricule && status !== "idle" && (
        <span className={`block text-[10px] ${status === "found" ? "text-emerald-600" : status === "missing" || status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {status === "loading" && "Recherche…"}
          {status === "found" && "Employé trouvé"}
          {status === "missing" && "Matricule introuvable"}
          {status === "error" && "Recherche impossible"}
        </span>
      )}
    </div>
  );
}
