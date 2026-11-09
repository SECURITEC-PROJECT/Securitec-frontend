import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type RegisterEmployeeOption } from "@/lib/service-api";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ShiftFormData } from "./FormPriseDePoste";
export type { ShiftFormData } from "./FormPriseDePoste";

interface ShiftEntryRow {
  id: string;
  query: string;
  employee: RegisterEmployeeOption | null;
  lastName: string;
  firstName: string;
  provider: string;
  postId: string;
  shiftType: "JOUR" | "NUIT";
  notes: string;
}

interface TableauPriseDePosteProps {
  onStart: (data: ShiftFormData, options?: { navigateToPost?: boolean }) => Promise<boolean>;
  initialSiteId?: string;
  initialPosteId?: string;
  initialPosteNom?: string;
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();
const createRow = (postId = ""): ShiftEntryRow => ({
  id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
  query: "",
  employee: null,
  lastName: "",
  firstName: "",
  provider: "",
  postId,
  shiftType: "JOUR",
  notes: "",
});

export default function TableauPriseDePoste({ onStart, initialSiteId = "", initialPosteId = "", initialPosteNom = "" }: TableauPriseDePosteProps) {
  const { sites } = useSites();
  const [siteId, setSiteId] = useState(initialSiteId);
  const [employees, setEmployees] = useState<RegisterEmployeeOption[]>([]);
  const [posts, setPosts] = useState<{ id: string; nom: string }[]>([]);
  const [rows, setRows] = useState<ShiftEntryRow[]>(() => [createRow(initialPosteId)]);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(initialSiteId || sites[0].id);
  }, [siteId, initialSiteId, sites]);

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    setLoading(true);
    setEmployees([]);
    setRows((current) => current.map((row) => ({ ...row, employee: null, query: "", lastName: "", firstName: "", provider: "" })));
    Promise.all([serviceApi.listShiftPosts(siteId), serviceApi.listRegisterEmployees(siteId)])
      .then(([availablePosts, availableEmployees]) => {
        if (!active) return;
        setPosts(availablePosts);
        setEmployees(availableEmployees);
        const defaultPostId = initialPosteId && availablePosts.some((post) => post.id === initialPosteId)
          ? initialPosteId
          : availablePosts[0]?.id || "";
        setRows((current) => current.map((row) => ({
          ...row,
          postId: availablePosts.some((post) => post.id === row.postId) ? row.postId : defaultPostId,
        })));
      })
      .catch((error: unknown) => { if (active) console.error("Chargement des postes et agents impossible:", error); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [siteId, initialPosteId]);

  const activeRow = rows.find((row) => row.id === activeRowId) || null;
  const filteredEmployees = useMemo(() => {
    if (!activeRow) return [];
    const search = normalize(activeRow.query);
    const matches = search
      ? employees.filter((employee) => normalize(`${employee.matricule} ${employee.firstName} ${employee.lastName} ${employee.prestataire || ""}`).includes(search))
      : employees;
    return matches.slice(0, 8);
  }, [activeRow, employees]);
  const site = sites.find((item) => item.id === siteId);

  const updateRow = (id: string, changes: Partial<ShiftEntryRow>) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...changes } : row));
  };

  const selectEmployee = (id: string, employee: RegisterEmployeeOption) => {
    updateRow(id, { employee, query: employee.matricule, lastName: employee.lastName, firstName: employee.firstName, provider: employee.prestataire || "" });
    setShowSuggestions(false);
  };

  const addRow = () => {
    const row = createRow(initialPosteId || posts[0]?.id || "");
    setRows((current) => [...current, row]);
  };

  const removeRow = (id: string) => {
    setRows((current) => current.length > 1 ? current.filter((row) => row.id !== id) : [createRow(initialPosteId || posts[0]?.id || "")]);
    if (activeRowId === id) {
      setActiveRowId(null);
      setShowSuggestions(false);
    }
  };

  const startShift = async (row: ShiftEntryRow) => {
    const lastName = row.employee?.lastName || row.lastName.trim();
    const firstName = row.employee?.firstName || row.firstName.trim();
    const matricule = row.employee?.matricule || row.query.trim() || `HORS-BASE-${row.id.slice(0, 8).replace(/-/g, "").toUpperCase()}`;
    if ((!row.employee && !lastName) || !siteId || !row.postId || savingRowId) return;
    const postName = posts.find((post) => post.id === row.postId)?.nom || initialPosteNom;
    setSavingRowId(row.id);
    try {
      const saved = await onStart({
        matricule,
        nom: lastName,
        prenom: firstName,
        prestataire: row.employee?.prestataire || row.provider.trim() || "Non renseigné",
        site_de_travail: row.employee?.siteName || site?.name || "",
        siteId: row.employee?.siteId || siteId,
        posteId: row.postId,
        posteNom: postName,
        shiftType: row.shiftType,
        chefMatricule: matricule,
        agentMatricules: [],
        notes: row.notes.trim(),
      }, { navigateToPost: false });
      if (saved) {
        setRows((current) => {
          const remaining = current.filter((item) => item.id !== row.id);
          return remaining.length ? remaining : [createRow(initialPosteId || posts[0]?.id || "")];
        });
        setShowSuggestions(false);
        setActiveRowId(null);
      }
    } finally {
      setSavingRowId(null);
    }
  };

  const changeSite = (nextSiteId: string) => {
    setSiteId(nextSiteId);
    setActiveRowId(null);
    setShowSuggestions(false);
    setRows((current) => current.map((row) => ({ ...row, query: "", employee: null, lastName: "", firstName: "", provider: "", postId: initialPosteId, notes: "" })));
  };

  return (
    <Panel title="Saisie du service">
      <div className="shift-entry-sheet" aria-label="Saisie directe de la prise de poste">
        <div className="shift-entry-sheet__toolbar">
          <p className="shift-entry-sheet__hint">Saisissez les informations directement dans les cellules. Chaque ligne s’enregistre séparément.</p>
          {!initialSiteId && <label className="shift-entry-sheet__site">Site de travail
            <select aria-label="Site de travail" value={siteId} onChange={(event) => changeSite(event.target.value)} disabled={loading}>
              {sites.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>}
          <Button type="button" variant="outline" className="shift-entry-sheet__add" onClick={addRow} disabled={loading || !siteId}>
            <Plus aria-hidden="true" /> Nouvelle ligne
          </Button>
        </div>
        <div className="shift-entry-sheet__scroll">
          <table className="shift-entry-sheet__table">
            <thead><tr>
              <th scope="col">Matricule (facultatif)</th><th scope="col">Nom *</th><th scope="col">Prénom</th><th scope="col">Prestataire</th>
              {initialSiteId && <th scope="col">Site</th>}<th scope="col">Poste *</th><th scope="col">Service *</th><th scope="col">Observations</th><th scope="col">Action</th>
            </tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}>
              <td>
                <Input
                  aria-label="Matricule ou nom de l'employé responsable"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={showSuggestions && activeRowId === row.id}
                  autoComplete="off"
                  value={row.query}
                  placeholder="Matricule (facultatif)"
                  disabled={loading || !siteId}
                  onFocus={() => { setActiveRowId(row.id); setShowSuggestions(true); }}
                  onChange={(event) => { updateRow(row.id, { query: event.target.value, employee: null }); setActiveRowId(row.id); setShowSuggestions(true); }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && activeRowId === row.id && filteredEmployees[0]) { event.preventDefault(); selectEmployee(row.id, filteredEmployees[0]); }
                    if (event.key === "Escape") setShowSuggestions(false);
                  }}
                />
              </td>
              <td><Input aria-label="Nom de l'agent" value={row.employee?.lastName || row.lastName} onChange={(event) => updateRow(row.id, { lastName: event.target.value, employee: null })} placeholder="Nom" /></td>
              <td><Input aria-label="Prénom de l'agent" value={row.employee?.firstName || row.firstName} onChange={(event) => updateRow(row.id, { firstName: event.target.value, employee: null })} placeholder="Prénom" /></td>
              <td><Input aria-label="Prestataire" value={row.employee?.prestataire || row.provider} onChange={(event) => updateRow(row.id, { provider: event.target.value, employee: null })} placeholder="Prestataire" /></td>
              {initialSiteId && <td>{site?.name || "—"}</td>}
              <td>{initialPosteId ? <span>{posts.find((post) => post.id === row.postId)?.nom || initialPosteNom || "Chargement…"}</span> : <select aria-label="Poste de garde" value={row.postId} onChange={(event) => updateRow(row.id, { postId: event.target.value })} disabled={loading || !posts.length}>
                {!posts.length && <option value="">Aucun poste configuré</option>}{posts.map((post) => <option key={post.id} value={post.id}>{post.nom}</option>)}
              </select>}</td>
              <td><select aria-label="Type de service" value={row.shiftType} onChange={(event) => updateRow(row.id, { shiftType: event.target.value as "JOUR" | "NUIT" })}><option value="JOUR">Jour</option><option value="NUIT">Nuit</option></select></td>
              <td><Textarea aria-label="Observations" value={row.notes} onChange={(event) => updateRow(row.id, { notes: event.target.value })} placeholder="Observation…" rows={1} /></td>
              <td className="shift-entry-sheet__actions">
                <Button type="button" size="sm" onClick={() => void startShift(row)} disabled={(!row.employee && !row.lastName.trim()) || !siteId || !row.postId || loading || savingRowId !== null}>
                  {savingRowId === row.id ? "Enregistrement…" : "Ouvrir"}
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Supprimer cette ligne" title="Supprimer cette ligne" onClick={() => removeRow(row.id)} disabled={savingRowId !== null}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </td>
            </tr>)}</tbody>
          </table>
        </div>

        {showSuggestions && activeRow && !activeRow.employee && <div className="shift-entry-sheet__suggestions" role="listbox" aria-label="Employés actifs du site">
          {loading ? <p>Chargement des employés…</p> : filteredEmployees.length ? filteredEmployees.map((item) => <button key={item.id} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => selectEmployee(activeRow.id, item)}>
            <strong>{item.matricule} · {item.firstName} {item.lastName}</strong><span>{item.prestataire || "Prestataire non renseigné"} · {item.siteName || site?.name}</span>
          </button>) : <p>Aucun employé actif ne correspond à cette recherche.</p>}
        </div>}
      </div>
    </Panel>
  );
}
