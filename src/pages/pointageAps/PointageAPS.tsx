import { PageHeader } from "@/components/PageHeader";
import { CalendarDays, Plus, Printer, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type ApsPostConfiguration } from "@/lib/service-api";

type Agent = { nom: string; prenom: string; matricule: string; heureEntree: string; heureSortie: string; observation: string };

const blankAgent = (): Agent => ({ nom: "", prenom: "", matricule: "", heureEntree: "", heureSortie: "", observation: "" });
const normalizeAgents = (
  data: Record<string, Agent[]>,
  service: "jour" | "nuit",
  configuredPostes: ApsPostConfiguration[] | null = null,
) => {
  const aliases = new Map<string, string>();
  if (service === "jour") {
    aliases.set("GARAGE", "EX GARAGE");
    aliases.set("PGIT", "PG2");
    aliases.set("FITAA", "FITAVA");
    aliases.set("EXTERIEUR", "PARKING EXTERIEUR");
  }
  const normalized = configuredPostes === null
    ? Object.fromEntries(Object.entries(data)
      .filter(([, agents]) => Array.isArray(agents))
      .map(([name, agents]) => [
        aliases.get(name) ?? name,
        agents.map((agent) => ({ ...blankAgent(), ...agent })),
      ])) as Record<string, Agent[]>
    : Object.fromEntries(configuredPostes.map(({ name, count }) => [
      name,
      Array.from({ length: count }, blankAgent),
    ])) as Record<string, Agent[]>;
  for (const [savedPoste, savedAgents] of Object.entries(data)) {
    const poste = aliases.get(savedPoste) ?? savedPoste;
    if (!Array.isArray(savedAgents)) continue;
    if (!normalized[poste]) continue;
    normalized[poste] = normalized[poste].map((agent, index) => ({
      ...agent,
      ...blankAgent(),
      ...(savedAgents[index] ?? {}),
    }));
  }
  return normalized;
};

export default function PointageAPS() {
  const { sites, siteError } = useSites();
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [siteId, setSiteId] = useState("");
  const [service, setService] = useState<"jour" | "nuit">("jour");
  const [agentsByKey, setAgentsByKey] = useState<Record<string, Record<string, Agent[]>>>({});
  const [saving, setSaving] = useState(false);
  const [savingConfiguration, setSavingConfiguration] = useState(false);
  const [newPostName, setNewPostName] = useState("");
  const [newPostCount, setNewPostCount] = useState(1);
  const activeSiteId = siteId || sites[0]?.id || "";
  const contextKey = `${activeSiteId}:${service}:${date}`;
  const agents = agentsByKey[contextKey] ?? {};
  const loading = Boolean(activeSiteId) && !Object.hasOwn(agentsByKey, contextKey);
  const displayedPostes = Object.entries(agents).map(([name, rows]) => ({ name, count: rows.length }));

  useEffect(() => {
    if (!activeSiteId) return;
    let active = true;
    serviceApi.getApsAttendance(date, service, activeSiteId)
      .then(({ data, postes: configuredPostes }) => {
        if (!active) return;
        setAgentsByKey((current) => ({
          ...current,
          [contextKey]: normalizeAgents(data ?? {}, service, configuredPostes),
        }));
      })
      .catch((error) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Chargement du pointage impossible.");
        setAgentsByKey((current) => ({ ...current, [contextKey]: {} }));
      });
    return () => { active = false; };
  }, [date, service, activeSiteId, contextKey]);

  const update = (poste: string, index: number, key: keyof Agent, value: string) => {
    setAgentsByKey((current) => {
      const currentAgents = current[contextKey] ?? {};
      return { ...current, [contextKey]: { ...currentAgents, [poste]: (currentAgents[poste] ?? []).map((agent, i) => i === index ? { ...agent, [key]: value } : agent) } };
    });
  };
  const persistConfiguration = async (nextAgents: Record<string, Agent[]>) => {
    setSavingConfiguration(true);
    try {
      await serviceApi.saveApsPostConfiguration({
        service,
        siteId: activeSiteId,
        postes: Object.entries(nextAgents).map(([name, rows]) => ({ name, count: rows.length })),
      });
      setAgentsByKey((current) => ({ ...current, [contextKey]: nextAgents }));
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement des postes impossible.");
      return false;
    } finally { setSavingConfiguration(false); }
  };
  const save = async () => {
    if (!activeSiteId) { toast.error("Selectionnez un site avant enregistrement."); return; }
    setSaving(true);
    try {
      await serviceApi.saveApsAttendance({
        date,
        service,
        siteId: activeSiteId,
        data: agents,
        postes: Object.entries(agents).map(([name, rows]) => ({ name, count: rows.length })),
      });
      toast.success(`Pointage ${service} enregistre dans la base de donnees.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement du pointage impossible.");
    } finally { setSaving(false); }
  };
  const reset = async () => {
    if (await confirmDeletion("Effacer les informations de pointage de cette date ?")) {
      setAgentsByKey((current) => ({ ...current, [contextKey]: initial }));
  const reset = () => {
    if (window.confirm("Effacer les informations de pointage de cette date ?")) {
      setAgentsByKey((current) => ({
        ...current,
        [contextKey]: Object.fromEntries(Object.entries(agents).map(([name, rows]) => [name, rows.map(blankAgent)])),
      }));
    }
  };

  const setAgentIdentity = (poste: string, index: number, identity: Pick<Agent, "nom" | "prenom">) => {
    setAgentsByKey((current) => {
      const currentAgents = current[contextKey] ?? {};
      return {
        ...current,
        [contextKey]: {
          ...currentAgents,
          [poste]: (currentAgents[poste] ?? []).map((agent, i) => i === index ? { ...agent, ...identity } : agent),
        },
      };
    });
  };

  const setPostCount = (poste: string, count: number) => {
    const currentRows = agents[poste] ?? [];
    const removedRows = currentRows.slice(count);
    const hasEnteredData = removedRows.some((agent) =>
      [agent.nom, agent.prenom, agent.matricule, agent.heureEntree, agent.heureSortie, agent.observation]
        .some((value) => value.trim()),
    );
    if (count < currentRows.length && hasEnteredData
      && !window.confirm(`Réduire l’effectif de « ${poste} » supprimera les lignes au-delà de ${count}. Continuer ?`)) {
      return;
    }
    const next = { ...agents };
    const resized = (next[poste] ?? []).slice(0, count);
    while (resized.length < count) resized.push(blankAgent());
    next[poste] = resized;
    void persistConfiguration(next);
  };

  const addPost = () => {
    const name = newPostName.trim().replace(/\s+/g, " ").toLocaleUpperCase("fr");
    if (!name) {
      toast.error("Saisissez le nom du poste à ajouter.");
      return;
    }
    if (Object.keys(agents).some((poste) => poste.toLocaleUpperCase("fr") === name)) {
      toast.error("Ce poste existe déjà pour ce service.");
      return;
    }
    const next = { ...agents, [name]: Array.from({ length: newPostCount }, blankAgent) };
    void persistConfiguration(next).then((saved) => {
      if (saved) {
        setNewPostName("");
        setNewPostCount(1);
        toast.success(`Poste ${name} enregistré dans la base de données.`);
      }
    });
  };

  const removePost = (poste: string) => {
    if (!window.confirm(`Supprimer le poste « ${poste} » et ses lignes du pointage ${service} ?`)) return;
    const next = { ...agents };
    delete next[poste];
    void persistConfiguration(next);
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
          <select id="pointage-site" value={activeSiteId} onChange={(event) => setSiteId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
            {!sites.length && <option value="">Aucun site disponible</option>}
            {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
          {siteError && <p className="mt-1 text-xs text-destructive">{siteError}</p>}
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button onClick={() => void save()} disabled={saving || savingConfiguration || loading || !activeSiteId} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"><Save className="size-4" />{saving ? "Enregistrement..." : "Enregistrer"}</button>
          <button onClick={reset} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted"><RotateCcw className="size-4" /> Effacer la journee</button>
          <button onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90"><Printer className="size-4" /> Imprimer</button>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Les postes et les effectifs sont enregistrés immédiatement en base. Cliquez sur Enregistrer pour sauvegarder les agents du pointage.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4 print:hidden">
        <div className="min-w-52 flex-1">
          <label htmlFor="new-aps-post" className="mb-1.5 block text-sm font-medium">Ajouter un poste</label>
          <input id="new-aps-post" value={newPostName} onChange={(event) => setNewPostName(event.target.value)} placeholder="Nom du nouveau poste" className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
        </div>
        <div>
          <label htmlFor="new-aps-count" className="mb-1.5 block text-sm font-medium">Nombre de personnes</label>
          <select id="new-aps-count" value={newPostCount} onChange={(event) => setNewPostCount(Number(event.target.value))} className="h-10 rounded-md border bg-background px-3 text-sm">
            {Array.from({ length: 30 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </div>
        <button type="button" onClick={addPost} disabled={loading || saving || savingConfiguration || !activeSiteId} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-50">
          <Plus className="size-4" /> Ajouter le poste
        </button>
      </div>
    </section>
    {loading && <p className="text-sm text-muted-foreground">Chargement du pointage enregistre...</p>}
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
        <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground"><tr>
          <th className="w-36 border-b px-4 py-3">Poste</th><th className="w-48 border-b px-4 py-3">Nom</th><th className="w-48 border-b px-4 py-3">Pr&#233;nom</th><th className="w-36 border-b px-4 py-3">Matricule</th><th className="w-36 border-b px-4 py-3">Heure d&#8217;entr&#233;e</th><th className="w-36 border-b px-4 py-3">Heure de sortie</th><th className="border-b px-4 py-3">Observation</th>
        </tr></thead>
        <tbody>{displayedPostes.map((poste) => agents[poste.name].map((agent, index) => <tr key={`${poste.name}-${index}`} className="group hover:bg-muted/30">
          {index === 0 && <th rowSpan={poste.count} className="border-b bg-muted/20 px-4 py-3 align-top font-semibold">
            <div className="flex items-start justify-between gap-2">
              <span>{poste.name}</span>
              <button type="button" onClick={() => removePost(poste.name)} disabled={savingConfiguration || saving} aria-label={`Supprimer le poste ${poste.name}`} title="Supprimer le poste" className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-50 print:hidden"><Trash2 className="size-4" /></button>
            </div>
            <label className="mt-2 block text-xs font-normal text-muted-foreground">
              Effectif
              <select aria-label={`Nombre de personnes au poste ${poste.name}`} value={poste.count} disabled={savingConfiguration || saving} onChange={(event) => setPostCount(poste.name, Number(event.target.value))} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm text-foreground print:hidden">
                {Array.from({ length: 30 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
              </select>
              <span className="hidden print:inline">{poste.count} personne(s)</span>
            </label>
          </th>}
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
