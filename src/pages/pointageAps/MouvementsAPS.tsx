import { PageHeader } from "@/components/PageHeader";
import MouvementApsEvenements from "@/pages/pointageAps/MouvementApsEvenements";
import { useSites } from "@/hooks/useSites";
import { confirmDeletion } from "@/lib/deletion-toast";
import { printRegistryTable } from "@/lib/registry-table";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";
import {
  serviceApi,
  type ApsMovementAgent,
  type ApsMovementData,
  type ApsPostConfiguration,
  type RegisterEmployeeOption,
} from "@/lib/service-api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CalendarDays, Download, FileDown, FileUp, Printer, RotateCcw, Save, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

const blankAgent = (): ApsMovementAgent => ({ nom: "", matricule: "" });
const normalizePostSearch = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLocaleLowerCase("fr");
const normalizeHeader = (value: string) => normalizePostSearch(value).replace(/[^a-z0-9]/g, "");
const normalizePersonName = (value: string) =>
  normalizePostSearch(value).replace(/[^a-z0-9 ]/g, "").split(" ").filter(Boolean).sort().join(" ");
const apsMovementHeaders = ["Date", "Service", "Poste", "Rang", "Nom", "Matricule"];

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
    const targetName = Object.keys(normalized).find((candidate) => candidate.toLocaleUpperCase("fr") === name.toLocaleUpperCase("fr"));
    if (!Array.isArray(rows) || !targetName) continue;
    normalized[targetName] = normalized[targetName].map((agent, index) => ({
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
  const [postSearch, setPostSearch] = useState("");
  const [dataByKey, setDataByKey] = useState<Record<string, ApsMovementData>>({});
  const [pendingStatusByKey, setPendingStatusByKey] = useState<Record<string, { status: string; error?: string } | undefined>>({});
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [savingConfiguration, setSavingConfiguration] = useState(false);
  const [importing, setImporting] = useState(false);
  const activeSiteId = siteId || sites[0]?.id || "";
  const employees = employeesBySite[activeSiteId] ?? [];
  const contextKey = `${activeSiteId}:${service}:${date}`;
  const agents = dataByKey[contextKey] ?? {};
  const loading = Boolean(activeSiteId) && (loadingKeys[contextKey] ?? !Object.hasOwn(dataByKey, contextKey));
  const allPostes = Object.entries(agents).map(([name, rows]) => ({ name, count: rows.length }));
  const normalizedPostSearch = normalizePostSearch(postSearch.trim());
  const displayedPostes = allPostes.filter((poste) => normalizePostSearch(poste.name).includes(normalizedPostSearch));

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
      .then(({ data, postes, pendingSync, pendingSyncStatus, pendingSyncError }) => {
        if (!active) return;
        setPendingStatusByKey((current) => ({
          ...current,
          [contextKey]: pendingSync ? { status: pendingSyncStatus || "pending", error: pendingSyncError } : undefined,
        }));
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
      const saved = await serviceApi.saveApsMovementPostConfiguration({
        siteId: activeSiteId,
        postes: Object.entries(nextAgents).map(([name, rows]) => ({ name, count: rows.length })),
      });
      setDataByKey((current) => ({ ...current, [contextKey]: nextAgents }));
      setPendingStatusByKey((current) => ({ ...current, [contextKey]: saved.pendingSync ? { status: "pending" } : undefined }));
      if (saved.pendingSync) toast.info("Configuration des postes enregistrée sur cet appareil, en attente de synchronisation.");
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
      const result = await serviceApi.saveApsMovements({
        date,
        service,
        siteId: activeSiteId,
        data: agents,
        postes: Object.entries(agents).map(([name, rows]) => ({ name, count: rows.length })),
      });
      setPendingStatusByKey((current) => ({ ...current, [contextKey]: result.pendingSync ? { status: "pending" } : undefined }));
      if (result.pendingSync) toast.info(`Mouvements APS du service ${service} enregistrés sur cet appareil, en attente de synchronisation.`);
      else toast.success(`Mouvements APS du service ${service} enregistrés.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement des mouvements APS impossible.");
    } finally {
      setSaving(false);
    }
  };

  const rowsForExport = () => displayedPostes.flatMap((poste) =>
    agents[poste.name].map((agent, index) => [
      date, service, poste.name, String(index + 1), agent.nom, agent.matricule,
    ]),
  );

  const exportMovements = () => {
    exportXlsx(`pointage-mouvements-aps-${service}-${date}.xlsx`, "Mouvements APS", apsMovementHeaders, rowsForExport());
  };

  const printMovements = () => {
    printRegistryTable(
      `Pointage APS — ${service}`,
      sites.find((site) => site.id === activeSiteId)?.name ?? "",
      apsMovementHeaders,
      rowsForExport(),
    );
  };

  const importMovements = async (file?: File) => {
    if (!file) return;
    if (!activeSiteId) {
      toast.error("Sélectionnez un site avant l’importation.");
      return;
    }
    if (loading || saving || savingConfiguration) {
      toast.error("Attendez le chargement du registre avant l’importation.");
      return;
    }
    if (!employees.length) {
      toast.error("Aucun employé n’est disponible pour ce site ; impossible de vérifier les matricules.");
      return;
    }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const headers = (sheet[0] || []).map((value) => normalizeHeader(String(value ?? "")));
      const column = (...aliases: string[]) => headers.findIndex((header) => aliases.some((alias) => header === normalizeHeader(alias)));
      const col = {
        date: column("date"),
        service: column("service", "jour nuit", "poste jour nuit"),
        post: column("poste", "poste de garde"),
        rank: column("rang", "ordre", "numero", "n"),
        name: column("nom", "nom et prenom", "nom complet", "agent"),
        matricule: column("matricule", "matricule agent"),
      };
      if (col.post < 0 || (col.name < 0 && col.matricule < 0)) {
        throw new Error("Colonnes requises manquantes : Poste et Nom ou Matricule.");
      }
      const get = (cells: string[], index: number) => index < 0 ? "" : String(cells[index] ?? "").trim();
      const findEmployee = (name: string, matricule: string) => {
        const byMatricule = matricule
          ? employees.find((employee) => normalizeHeader(employee.matricule) === normalizeHeader(matricule))
          : undefined;
        const normalizedName = normalizePersonName(name);
        const nameMatches = normalizedName
          ? employees.filter((employee) => [
            `${employee.firstName} ${employee.lastName}`,
            `${employee.lastName} ${employee.firstName}`,
            employee.lastName,
          ].some((candidate) => normalizePersonName(candidate) === normalizedName))
          : [];
        if (byMatricule && nameMatches.length && !nameMatches.some((employee) => employee.id === byMatricule.id)) return null;
        if (byMatricule) return byMatricule;
        return nameMatches.length === 1 ? nameMatches[0] : null;
      };
      const parseDate = (value: string) => {
        if (!value) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const frenchDate = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(value);
        if (frenchDate) return `${frenchDate[3]}-${frenchDate[2].padStart(2, "0")}-${frenchDate[1].padStart(2, "0")}`;
        const serial = Number(value);
        return Number.isFinite(serial) && serial > 20000 && serial < 80000
          ? new Date(Date.UTC(1899, 11, 30 + Math.floor(serial))).toISOString().slice(0, 10)
          : value;
      };
      const importRows = sheet.slice(1).map((cells, index) => ({
        line: index + 2,
        date: parseDate(get(cells, col.date)),
        service: get(cells, col.service),
        post: get(cells, col.post),
        rank: get(cells, col.rank),
        name: get(cells, col.name),
        matricule: get(cells, col.matricule),
      })).filter((_, index) => sheet[index + 1]?.some((value) => String(value ?? "").trim()));
      if (!importRows.length) throw new Error("Le fichier ne contient aucune ligne à importer.");

      const nextData = Object.fromEntries(Object.entries(agents).map(([name, rows]) => [name, rows.map((agent) => ({ ...agent }))]));
      const assigned = new Map<string, Set<number>>();
      const failures: string[] = [];
      let importedCount = 0;
      for (const row of importRows) {
        if (!row.name && !row.matricule) continue;
        if (row.date && row.date !== date) {
          failures.push(`Ligne ${row.line} : la date ne correspond pas à la date sélectionnée.`);
          continue;
        }
        if (row.service && normalizeHeader(row.service) !== normalizeHeader(service)) {
          failures.push(`Ligne ${row.line} : le service ne correspond pas au service sélectionné (${service}).`);
          continue;
        }
        const postName = Object.keys(nextData).find((candidate) => normalizeHeader(candidate) === normalizeHeader(row.post));
        if (!postName) {
          failures.push(`Ligne ${row.line} : poste « ${row.post} » non configuré pour ce site.`);
          continue;
        }
        const employee = findEmployee(row.name, row.matricule);
        if (!employee) {
          failures.push(`Ligne ${row.line} : matricule ou nom non reconnu, ou nom/matricule incohérents.`);
          continue;
        }
        const ranks = assigned.get(postName) ?? new Set<number>();
        const requestedRank = row.rank ? Number(row.rank) - 1 : -1;
        const rank = row.rank
          ? requestedRank
          : nextData[postName].findIndex((_, index) => !ranks.has(index));
        if (!Number.isInteger(rank) || rank < 0 || rank >= nextData[postName].length || ranks.has(rank)) {
          failures.push(`Ligne ${row.line} : rang invalide ou dupliqué pour le poste « ${postName} ».`);
          continue;
        }
        ranks.add(rank);
        assigned.set(postName, ranks);
        nextData[postName][rank] = { nom: employee.lastName, matricule: employee.matricule };
        importedCount += 1;
      }
      if (importedCount) {
        const result = await serviceApi.saveApsMovements({
          date,
          service,
          siteId: activeSiteId,
          data: nextData,
          postes: Object.entries(nextData).map(([name, rows]) => ({ name, count: rows.length })),
        });
        setDataByKey((current) => ({ ...current, [contextKey]: nextData }));
        setPendingStatusByKey((current) => ({ ...current, [contextKey]: result.pendingSync ? { status: "pending" } : undefined }));
        toast[result.pendingSync ? "info" : "success"](`${importedCount} matricule(s) importé(s)${result.pendingSync ? ", en attente de synchronisation" : ""}.`);
      }
      if (failures.length) toast.error(`${failures.length} ligne(s) non importée(s) : ${failures.slice(0, 2).join(" ")}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lecture ou enregistrement du fichier impossible.");
    } finally {
      setImporting(false);
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

  return (
    <div className="space-y-5">
      <PageHeader title="Mouvements APS" subtitle="Module 1 — Pointage APS (Jour et Nuit) : nom et matricule par poste." />
    <section className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm print:hidden">
      <div className="w-full max-w-sm">
        <label htmlFor="aps-movement-global-site" className="mb-1.5 block text-sm font-medium">Site des modules APS</label>
        <select
          id="aps-movement-global-site"
          value={activeSiteId}
          onChange={(event) => setSiteId(event.target.value)}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          {!sites.length && <option value="">Aucun site disponible</option>}
          {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
        </select>
        {siteError && <p className="mt-1 text-xs text-destructive">{siteError}</p>}
      </div>
    </section>
    <Tabs defaultValue="pointage-aps" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 print:hidden" aria-label="Modules des mouvements APS">
          <TabsTrigger value="pointage-aps">Pointage APS (Jour et Nuit)</TabsTrigger>
          <TabsTrigger value="module-2">Mouvement</TabsTrigger>
        </TabsList>
        <TabsContent value="pointage-aps" className="mt-0 space-y-5">
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
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button type="button" onClick={() => void save()} disabled={saving || savingConfiguration || loading || !activeSiteId}>
              <Save className="mr-2 size-4" />{saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void reset()} disabled={loading}>
              <RotateCcw className="mr-2 size-4" />Effacer la journée
            </Button>
          </div>
        </div>
        <div className="mt-4 grid w-full grid-cols-1 gap-2 print:hidden sm:grid-cols-2 xl:grid-cols-5">
          <label className={`inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md border px-3 text-center text-sm font-medium ${!activeSiteId || loading || saving || savingConfiguration || importing ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}>
            <FileUp className="mr-2 size-4" />{importing ? "Importation…" : "Importer Excel / CSV"}
            <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={!activeSiteId || loading || saving || savingConfiguration || importing} onChange={(event) => { void importMovements(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          </label>
          <Button className="w-full" type="button" variant="outline" onClick={() => exportXlsx(
            "modele-pointage-mouvements-aps.xlsx",
            "Mouvements APS",
            apsMovementHeaders,
            allPostes.flatMap((poste) => Array.from({ length: poste.count }, (_, index) => [date, service, poste.name, String(index + 1), "", ""])),
          )}>
            <FileDown className="mr-2 size-4" />Modèle Excel
          </Button>
          <Button className="w-full" type="button" variant="outline" disabled={!displayedPostes.length} onClick={exportMovements}>
            <Download className="mr-2 size-4" />Exporter Excel
          </Button>
          <Button className="w-full" type="button" variant="outline" disabled={!displayedPostes.length} onClick={printMovements}>
            <Printer className="mr-2 size-4" />Imprimer les lignes (Word)
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Ce registre est indépendant du Pointage APS. Les postes proviennent de l’administration et les données enregistrées ici contiennent uniquement le nom et le matricule.</p>
        <p className="mt-4 border-t pt-4 text-xs text-muted-foreground print:hidden">Ajustez l’effectif de chaque poste dans le tableau ci-dessous.</p>
      </section>

      {loading && <p className="text-sm text-muted-foreground">Chargement des mouvements APS…</p>}
      {pendingStatusByKey[contextKey] && <p className={`text-sm ${pendingStatusByKey[contextKey].status === "pending" ? "text-amber-700" : "text-destructive"}`} title={pendingStatusByKey[contextKey].error}>
        {pendingStatusByKey[contextKey].status === "conflict" ? "Conflit : les mouvements APS n’ont pas été confirmés par le serveur." : pendingStatusByKey[contextKey].status === "rejected" ? "Mouvements APS rejetés par le serveur. Vérifiez les données avant de réessayer." : "Mouvements enregistrés sur cet appareil, en attente de synchronisation."}
      </p>}
      <div className="relative w-full max-w-sm print:hidden">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          aria-label="Rechercher un poste"
          placeholder="Rechercher un poste..."
          value={postSearch}
          onChange={(event) => setPostSearch(event.target.value)}
          className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[900px] table-fixed border-collapse text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-[26%] border-b px-4 py-3">Poste</th>
              <th className="w-[37%] border-b px-4 py-3">Nom</th>
              <th className="w-[37%] border-b px-4 py-3">Matricule</th>
            </tr>
          </thead>
          <tbody>
            {displayedPostes.map((poste) => agents[poste.name].map((agent, index) => (
              <tr key={`${poste.name}-${index}`} className="group hover:bg-muted/30">
                {index === 0 && <th rowSpan={poste.count} className="border-b bg-muted/20 px-4 py-3 align-top font-semibold">
                  <span>{poste.name}</span>
                  <label className="mt-2 block text-xs font-normal text-muted-foreground">
                    Effectif
                    <select aria-label={`Nombre de personnes au poste ${poste.name}`} value={poste.count} disabled={savingConfiguration || saving} onChange={(event) => void setPostCount(poste.name, Number(event.target.value))} className="mt-1 h-8 w-full min-w-0 max-w-40 box-border rounded-md border bg-background px-2 text-sm text-foreground print:hidden">
                      {Array.from({ length: 30 }, (_, countIndex) => countIndex + 1).map((count) => <option key={count} value={count}>{count}</option>)}
                    </select>
                    <span className="hidden print:inline">{poste.count} personne(s)</span>
                  </label>
                </th>}
                <td className="border-b px-3 py-2">
                  <input aria-label={`Nom ${poste.name} ${index + 1}`} value={agent.nom} readOnly placeholder="Rempli depuis le matricule" className="h-9 w-full min-w-0 rounded-md border border-transparent bg-muted/30 px-2 print:border-0" />
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
            {!loading && !displayedPostes.length && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">{allPostes.length && normalizedPostSearch ? "Aucun poste ne correspond à la recherche." : "Aucun poste actif n’est configuré pour ce site dans l’administration."}</td></tr>}
          </tbody>
        </table>
      </div>
      <style>{`@media print { @page { size: landscape; margin: 12mm; } body { background: white !important; } button, .print\\:hidden { display: none !important; } input { border: 0 !important; } }`}</style>
        </TabsContent>
        <TabsContent value="module-2" className="mt-0">
          <MouvementApsEvenements
            activeSiteId={activeSiteId}
            activeSiteName={sites.find((site) => site.id === activeSiteId)?.name ?? ""}
          />
        </TabsContent>
      </Tabs>
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
