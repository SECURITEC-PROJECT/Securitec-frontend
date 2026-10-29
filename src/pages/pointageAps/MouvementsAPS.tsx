import { PageHeader } from "@/components/PageHeader";
import { useSites } from "@/hooks/useSites";
import { confirmDeletion } from "@/lib/deletion-toast";
import {
  serviceApi,
  type ApsMovementAgent,
  type ApsMovementData,
  type ApsPostConfiguration,
  type RegisterEmployeeOption,
} from "@/lib/service-api";
import { CalendarDays, Plus, Printer, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

const blankAgent = (): ApsMovementAgent => ({ nom: "", matricule: "" });

function normalizeData(
  data: ApsMovementData | null,
  postes: ApsPostConfiguration[] | null,
): ApsMovementData {
  const normalized = postes
    ? Object.fromEntries(postes.map(({ name, count }) => [
      name,
      Array.from({ length: count }, blankAgent),
    ]))
    : Object.fromEntries(Object.entries(data ?? {})
      .filter(([, agents]) => Array.isArray(agents))
      .map(([name, agents]) => [
        name,
        agents.map((agent) => ({ ...blankAgent(), ...agent })),
      ]));

  for (const [name, rows] of Object.entries(data ?? {})) {
    if (!Array.isArray(rows) || !normalized[name]) continue;
    normalized[name] = normalized[name].map((agent, index) => ({
      ...agent,
      ...(rows[index] ?? {}),
    }));
  }
  return normalized;
}

export default function MouvementsAPS() {
  const { sites, siteError } = useSites();
  const [employeesBySite, setEmployeesBySite] = useState<Record<string, RegisterEmployeeOption[]>>({});
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [siteId, setSiteId] = useState("");
  const [service, setService] = useState<"jour" | "nuit">("jour");
  const [dataByKey, setDataByKey] = useState<Record<string, ApsMovementData>>({});
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [savingConfiguration, setSavingConfiguration] = useState(false);
  const [newPostName, setNewPostName] = useState("");
  const [newPostCount, setNewPostCount] = useState(1);
  const activeSiteId = siteId || sites[0]?.id || "";
  const employees = employeesBySite[activeSiteId] ?? [];
  const contextKey = `${activeSiteId}:${service}:${date}`;
  const agents = dataByKey[contextKey] ?? {};
  const loading = Boolean(activeSiteId) && (loadingKeys[contextKey] ?? !Object.hasOwn(dataByKey, contextKey));
  const displayedPostes = Object.entries(agents).map(([name, rows]) => ({ name, count: rows.length }));

  useEffect(() => {
    if (!activeSiteId || employeesBySite[activeSiteId]) return;
    let active = true;
    serviceApi.listRegisterEmployees(activeSiteId)
      .then((employeeRows) => {
        if (active) {
          setEmployeesBySite((current) => ({ ...current, [activeSiteId]: employeeRows }));
        }
      })
      .catch((error) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Chargement des employés impossible.");
        }
      });
    return () => { active = false; };
  }, [activeSiteId, employeesBySite]);

  useEffect(() => {
    if (!activeSiteId) return;
    let active = true;
    setLoadingKeys((current) => ({ ...current, [contextKey]: true }));
    serviceApi.getApsMovements(date, service, activeSiteId)
      .then(({ data, postes }) => {
        if (!active) return;
        setDataByKey((current) => ({
          ...current,
          [contextKey]: normalizeData(data, postes),
        }));
      })
      .catch((error) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Chargement des mouvements APS impossible.");
        setDataByKey((current) => ({ ...current, [contextKey]: {} }));
      })
      .finally(() => {
        if (active) setLoadingKeys((current) => ({ ...current, [contextKey]: false }));
      });
    return () => { active = false; };
  }, [date, service, activeSiteId, contextKey]);

  const update = (poste: string, index: number, key: keyof ApsMovementAgent, value: string) => {
    setDataByKey((current) => {
      const currentAgents = current[contextKey] ?? {};
      return {
        ...current,
        [contextKey]: {
          ...currentAgents,
          [poste]: (currentAgents[poste] ?? []).map((agent, rowIndex) =>
            rowIndex === index ? { ...agent, [key]: value } : agent),
        },
      };
    });
  };

  const persistConfiguration = async (nextAgents: ApsMovementData) => {
    if (!activeSiteId) {
      toast.error("Sélectionnez un site avant de configurer les postes.");
      return false;
    }
    setSavingConfiguration(true);
    try {
      await serviceApi.saveApsMovementPostConfiguration({
        siteId: activeSiteId,
        postes: Object.entries(nextAgents).map(([name, rows]) => ({ name, count: rows.length })),
      });
      setDataByKey((current) => ({ ...current, [contextKey]: nextAgents }));
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement des postes impossible.");
      return false;
    } finally {
      setSavingConfiguration(false);
    }
  };

  const save = async () => {
    if (!activeSiteId) {
      toast.error("Sélectionnez un site avant l’enregistrement.");
      return;
    }
    setSaving(true);
    try {
      await serviceApi.saveApsMovements({
        date,
        service,
        siteId: activeSiteId,
        data: agents,
        postes: Object.entries(agents).map(([name, rows]) => ({ name, count: rows.length })),
      });
      toast.success(`Mouvements APS du service ${service} enregistrés.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement des mouvements APS impossible.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!(await confirmDeletion("Effacer les noms et matricules de cette date ?"))) return;
    setDataByKey((current) => ({
      ...current,
      [contextKey]: Object.fromEntries(Object.entries(agents).map(([name, rows]) => [name, rows.map(blankAgent)])),
    }));
  };

  const setPostCount = async (poste: string, count: number) => {
    const currentRows = agents[poste] ?? [];
    const removedRows = currentRows.slice(count);
    if (count < currentRows.length && removedRows.some((agent) => agent.nom.trim() || agent.matricule.trim())
      && !(await confirmDeletion(`Réduire l’effectif de « ${poste} » supprimera les lignes au-delà de ${count}. Cette action est définitive.`))) {
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
        toast.success(`Poste ${name} enregistré dans le module Mouvements APS.`);
      }
    });
  };

  const removePost = async (poste: string) => {
    if (!(await confirmDeletion(`Supprimer le poste « ${poste} » et ses lignes des Mouvements APS ${service} ? Cette action est définitive.`))) return;
    const next = { ...agents };
    delete next[poste];
    void persistConfiguration(next);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Mouvements APS" subtitle="Module 1 — Pointage APS (Jour et Nuit) : nom et matricule par poste." />
      <div className="flex w-fit gap-1 rounded-lg border bg-muted/40 p-1 print:hidden" role="tablist" aria-label="Service des mouvements APS">
        {(["jour", "nuit"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={service === item}
            onClick={() => setService(item)}
            className={`rounded-md px-5 py-2 text-sm font-medium capitalize transition-colors ${service === item ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background"}`}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-full max-w-xs">
            <label htmlFor="aps-movement-date" className="mb-1.5 block text-sm font-medium">Date</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input id="aps-movement-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" />
            </div>
          </div>
          <div className="w-full max-w-xs">
            <label htmlFor="aps-movement-site" className="mb-1.5 block text-sm font-medium">Site</label>
            <select id="aps-movement-site" value={activeSiteId} onChange={(event) => setSiteId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {!sites.length && <option value="">Aucun site disponible</option>}
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
            {siteError && <p className="mt-1 text-xs text-destructive">{siteError}</p>}
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" onClick={() => void save()} disabled={saving || savingConfiguration || loading || !activeSiteId} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50">
              <Save className="size-4" />{saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={() => void reset()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-50">
              <RotateCcw className="size-4" />Effacer la journée
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90">
              <Printer className="size-4" />Imprimer
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Ce registre est indépendant du Pointage APS. Les données enregistrées ici contiennent uniquement le nom et le matricule.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4 print:hidden">
          <div className="min-w-52 flex-1">
            <label htmlFor="new-aps-movement-post" className="mb-1.5 block text-sm font-medium">Ajouter un poste</label>
            <input id="new-aps-movement-post" value={newPostName} onChange={(event) => setNewPostName(event.target.value)} placeholder="Nom du nouveau poste" className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
          </div>
          <div>
            <label htmlFor="new-aps-movement-count" className="mb-1.5 block text-sm font-medium">Nombre de personnes</label>
            <select id="new-aps-movement-count" value={newPostCount} onChange={(event) => setNewPostCount(Number(event.target.value))} className="h-10 rounded-md border bg-background px-3 text-sm">
              {Array.from({ length: 30 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </div>
          <button type="button" onClick={addPost} disabled={loading || saving || savingConfiguration || !activeSiteId} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-50">
            <Plus className="size-4" />Ajouter le poste
          </button>
        </div>
      </section>

      {loading && <p className="text-sm text-muted-foreground">Chargement des mouvements APS…</p>}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[700px] border-collapse text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-40 border-b px-4 py-3">Poste</th>
              <th className="w-64 border-b px-4 py-3">Nom</th>
              <th className="w-52 border-b px-4 py-3">Matricule</th>
            </tr>
          </thead>
          <tbody>
            {displayedPostes.map((poste) => agents[poste.name].map((agent, index) => (
              <tr key={`${poste.name}-${index}`} className="group hover:bg-muted/30">
                {index === 0 && <th rowSpan={poste.count} className="border-b bg-muted/20 px-4 py-3 align-top font-semibold">
                  <div className="flex items-start justify-between gap-2">
                    <span>{poste.name}</span>
                    <button type="button" onClick={() => void removePost(poste.name)} disabled={savingConfiguration || saving} aria-label={`Supprimer le poste ${poste.name}`} title="Supprimer le poste" className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-50 print:hidden">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <label className="mt-2 block text-xs font-normal text-muted-foreground">
                    Effectif
                    <select aria-label={`Nombre de personnes au poste ${poste.name}`} value={poste.count} disabled={savingConfiguration || saving} onChange={(event) => void setPostCount(poste.name, Number(event.target.value))} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm text-foreground print:hidden">
                      {Array.from({ length: 30 }, (_, countIndex) => countIndex + 1).map((count) => <option key={count} value={count}>{count}</option>)}
                    </select>
                    <span className="hidden print:inline">{poste.count} personne(s)</span>
                  </label>
                </th>}
                <td className="border-b px-3 py-2">
                  <input aria-label={`Nom ${poste.name} ${index + 1}`} value={agent.nom} readOnly placeholder="Rempli depuis le matricule" className="h-9 w-full rounded-md border border-transparent bg-muted/30 px-2 print:border-0" />
                </td>
                <td className="border-b px-3 py-2">
                  <MatriculeAgentInput
                    poste={poste.name}
                    index={index}
                    value={agent.matricule}
                    employees={employees}
                    onChange={(value) => {
                      update(poste.name, index, "matricule", value);
                      update(poste.name, index, "nom", "");
                    }}
                    onEmployeeSelected={(selected) => {
                      update(poste.name, index, "matricule", selected.matricule);
                      update(poste.name, index, "nom", selected.lastName);
                    }}
                  />
                </td>
              </tr>
            )))}
            {!loading && !displayedPostes.length && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun poste configuré pour ce service.</td></tr>}
          </tbody>
        </table>
      </div>
      <style>{`@media print { @page { size: landscape; margin: 12mm; } body { background: white !important; } button, .print\\:hidden { display: none !important; } input { border: 0 !important; } }`}</style>
    </div>
  );
}

function MatriculeAgentInput({
  poste,
  index,
  value,
  employees,
  onChange,
  onEmployeeSelected,
}: {
  poste: string;
  index: number;
  value: string;
  employees: RegisterEmployeeOption[];
  onChange: (value: string) => void;
  onEmployeeSelected: (employee: RegisterEmployeeOption) => void;
}) {
  const listId = useId();
  const onEmployeeSelectedRef = useRef(onEmployeeSelected);
  const normalizedValue = value.trim().toLocaleUpperCase();
  const exactMatch = normalizedValue
    ? employees.find((employee) => employee.matricule.trim().toLocaleUpperCase() === normalizedValue)
    : undefined;

  useEffect(() => {
    onEmployeeSelectedRef.current = onEmployeeSelected;
  }, [onEmployeeSelected]);

  useEffect(() => {
    if (exactMatch) onEmployeeSelectedRef.current(exactMatch);
  }, [exactMatch]);

  return (
    <div>
      <input
        aria-label={`Matricule ${poste} ${index + 1}`}
        value={value}
        list={listId}
        autoComplete="off"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder="Saisir un matricule"
        className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none focus:border-input focus:bg-background"
      />
      <datalist id={listId}>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.matricule}>
            {employee.firstName} {employee.lastName} · Section : {employee.section || "—"}
          </option>
        ))}
      </datalist>
      {exactMatch && <span className="block text-[10px] text-emerald-600">Employé trouvé</span>}
    </div>
  );
}
