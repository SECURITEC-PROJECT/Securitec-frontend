import { Empty, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const MADAGASCAR_TIME_ZONE = "Indian/Antananarivo";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();
const dateInSiteTimeZone = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: MADAGASCAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

// 💡 EXPORT OBLIGATOIRE DE L'INTERFACE SHIFT
export interface Shift {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string;
  prestataire: string;
  site_de_travail: string;
  siteId?: string | null;
  posteId?: string | null;
  posteNom?: string | null;
  shiftType?: "JOUR" | "NUIT" | null;
  fonctionService?: "CHEF" | "AGENT" | null;
  serviceId?: string | null;
  agents?: Shift[];
  started_at: string;
  ended_at: string | null;
  checks?: Record<string, boolean>;
  notes?: string;
  pendingAgentCount?: number;
  pendingSync?: boolean;
  pendingSyncAction?: "open" | "end";
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

interface ListHistoriquePriseDePosteProps {
  shifts: Shift[];
  onOpenEndDialog: (shift: Shift, isOnlyOne: boolean) => void;
  fmt: (dateStr: string | null) => string;
}

export default function ListHistoriquePriseDePoste({
  shifts,
  onOpenEndDialog,
  fmt,
}: ListHistoriquePriseDePosteProps) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [serviceFilter, setServiceFilter] = useState<"" | "JOUR" | "NUIT">("");
  const groups = Array.from(shifts.reduce((all, shift) => {
    const key = shift.serviceId || shift.id;
    const group = all.get(key) || [];
    group.push(shift);
    all.set(key, group);
    return all;
  }, new Map<string, Shift[]>()).entries()).map(([serviceId, members]) => ({
    ...((members.find((member) => member.fonctionService === "CHEF") || members[0]) as Shift),
    serviceId,
    agents: members,
  }));
  const query = normalize(search);
  const filteredGroups = groups.filter((shift) => {
      const crew = shift.agents || [shift];
      const searchText = normalize([
        shift.posteNom, shift.site_de_travail, shift.prestataire, shift.shiftType, shift.notes,
        shift.ended_at ? "terminé" : "en cours",
        ...crew.flatMap((agent) => [agent.nom, agent.prenom, agent.matricule, agent.prestataire]),
      ].filter(Boolean).join(" "));
      const started = dateInSiteTimeZone(shift.started_at);
      const ended = shift.ended_at ? dateInSiteTimeZone(shift.ended_at) : started;
      return (!query || searchText.includes(query))
        && (!dateFrom || ended >= dateFrom)
        && (!dateTo || started <= dateTo)
        && (!serviceFilter || shift.shiftType === serviceFilter);
  });
  const allActiveShiftCount = groups.filter((shift) => shift.ended_at === null && shift.pendingSyncAction !== "open").length;
  const pendingStartShifts = filteredGroups.filter((shift) => shift.pendingSyncAction === "open");
  const activeShifts = filteredGroups.filter((shift) => shift.ended_at === null && shift.pendingSyncAction !== "open");
  const finishedShifts = filteredGroups.filter((shift) => shift.ended_at !== null);

  const todayStr = new Date().toLocaleDateString("fr-FR", { timeZone: MADAGASCAR_TIME_ZONE });

  const fmtFull = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "—";
    return `${date.toLocaleDateString("fr-FR", { timeZone: MADAGASCAR_TIME_ZONE })} à ${date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: MADAGASCAR_TIME_ZONE,
    })}`;
  };

  return (
    <Panel title="Services en cours & Historique">
      <div className="shift-history-filters" aria-label="Recherche dans l'historique">
        <label className="shift-history-filters__search">Recherche
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, matricule, poste, site…" />
        </label>
        <label>Date de début<input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label>Date de fin<input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} /></label>
        <label>Service<select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value as "" | "JOUR" | "NUIT")}>
          <option value="">Tous</option><option value="JOUR">Jour</option><option value="NUIT">Nuit</option>
        </select></label>
        {(search || dateFrom || dateTo || serviceFilter) && <Button type="button" variant="ghost" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setServiceFilter(""); }}>Effacer</Button>}
      </div>
      <p className="shift-history-result-count" aria-live="polite">{filteredGroups.length} service(s) correspondant(s)</p>
      <div className="mb-6">
        <h3 className="shift-section-heading mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          En service ({activeShifts.length}) · <span className="normal-case font-normal text-xs">{todayStr}</span>
        </h3>
        {activeShifts.length > 0 ? (
          <ul className="shift-active-list space-y-3">
            {activeShifts.map((s) => (
              <li
                key={s.id}
                className="shift-active-card flex items-center justify-between rounded-md border p-3 text-sm bg-background shadow-sm"
              >
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-base"><span>{s.posteNom || "Poste non renseigné"}</span><span className={`shift-type-pill ${s.shiftType === "NUIT" ? "shift-type-pill--night" : "shift-type-pill--day"}`}>{s.shiftType === "NUIT" ? "Nuit" : s.shiftType === "JOUR" ? "Jour" : "Service"}</span></p>
                  <p className="text-sm">Chef : {s.nom} {s.prenom} {s.matricule ? `(${s.matricule})` : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.site_de_travail} · {s.pendingAgentCount || s.agents?.length || 1} agent(s) · {s.agents?.filter((agent) => agent.fonctionService !== "CHEF").map((agent) => `${agent.prenom} ${agent.nom}`).join(", ") || "aucun autre agent"}
                  </p>
                  {s.pendingSync && <p className="mt-1 text-xs text-amber-700">
                    {s.pendingSyncAction === "end"
                      ? `Clôture non confirmée — service toujours ouvert sur le serveur${s.pendingSyncStatus === "conflict" ? " (conflit)" : s.pendingSyncStatus === "rejected" ? " (rejetée)" : ""}`
                      : s.pendingSyncStatus === "conflict" ? "Conflit de synchronisation" : s.pendingSyncStatus === "rejected" ? "Prise de poste rejetée" : "En attente de synchronisation"}
                    {s.pendingSyncError ? ` · ${s.pendingSyncError}` : ""}
                  </p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Début : <span className="font-mono">{fmt(s.started_at)}</span>
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shift-end-button"
                  onClick={() => onOpenEndDialog(s, allActiveShiftCount === 1)}
                  disabled={s.pendingSync}
                >
                  Terminer
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">{filteredGroups.length ? "Aucun agent actuellement en service." : "Aucun service ne correspond à cette recherche."}</p>
        )}
      </div>

      {pendingStartShifts.length > 0 && <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-700">
          Prises de poste à confirmer ({pendingStartShifts.length})
        </h3>
        <ul className="shift-pending-list space-y-3">
          {pendingStartShifts.map((s) => <li key={s.id} className="shift-pending-card rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <p className="flex flex-wrap items-center gap-2 font-semibold"><span>{s.posteNom || "Poste non renseigné"}</span><span className="shift-type-pill shift-type-pill--pending">{s.shiftType === "NUIT" ? "Nuit" : "Jour"}</span></p>
            <p>Chef : {s.nom} {s.prenom} {s.matricule ? `(${s.matricule})` : ""}</p>
            <p className="text-xs text-muted-foreground">{s.site_de_travail} · {s.pendingAgentCount || 1} agent(s)</p>
            <p className="mt-1 text-xs text-amber-700">
              {s.pendingSyncStatus === "conflict" ? "Conflit : le serveur n’a pas ouvert ce service" : s.pendingSyncStatus === "rejected" ? "Rejetée : le serveur n’a pas ouvert ce service" : "En attente : ce service n’est pas encore ouvert sur le serveur"}
              {s.pendingSyncError ? ` · ${s.pendingSyncError}` : ""}
            </p>
          </li>)}
        </ul>
      </div>}

      <div className="shift-finished-section">
        <h3 className="shift-section-heading mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Historique des terminés
        </h3>
        {finishedShifts.length > 0 ? (
          <div className="shift-history-table-wrap overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr><th>Poste / Site</th><th>Service</th><th>Équipe</th><th>Prise</th><th>Fin</th><th>État</th></tr></thead><tbody>
            {finishedShifts.map((s) => <tr key={s.id}>
              <td><strong>{s.posteNom || "Poste non renseigné"}</strong><small className="block text-muted-foreground">{s.site_de_travail}</small></td>
              <td><span className={`shift-type-pill ${s.shiftType === "NUIT" ? "shift-type-pill--night" : "shift-type-pill--day"}`}>{s.shiftType === "NUIT" ? "Nuit" : s.shiftType === "JOUR" ? "Jour" : "Service"}</span></td>
              <td>{s.agents?.length || 1} agent(s)<small className="block text-muted-foreground">Chef : {s.prenom} {s.nom}</small></td>
              <td className="whitespace-nowrap">{fmtFull(s.started_at)}</td><td className="whitespace-nowrap">{fmtFull(s.ended_at)}</td>
              <td><span className="shift-closed-pill">Terminé</span>{s.pendingSync && <small className="mt-1 block text-amber-700">Synchronisation en attente{s.pendingSyncError ? ` · ${s.pendingSyncError}` : ""}</small>}</td>
            </tr>)}
          </tbody></table></div>
        ) : (
          <Empty text="Aucune prise de poste terminée" />
        )}
      </div>
    </Panel>
  );
}
