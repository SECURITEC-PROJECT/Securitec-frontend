import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSites } from "@/hooks/useSites";
import { useEffect, useMemo, useState } from "react";
import SelecteursPoste from "./components/SelecteursPoste";
import { serviceApi, type RegisterEmployeeOption } from "@/lib/service-api";

export interface ShiftFormData {
  matricule: string;
  nom: string;
  prenom: string;
  prestataire: string;
  site_de_travail: string;
  siteId: string;
  posteId: string;
  posteNom: string;
  shiftType: "JOUR" | "NUIT";
  chefMatricule: string;
  agentMatricules: string[];
  notes: string;
}

interface FormPriseDePosteProps {
  onStart: (data: ShiftFormData) => Promise<boolean>;
  initialSiteId?: string;
  initialPosteId?: string;
  initialPosteNom?: string;
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();

export default function FormPriseDePoste({ onStart, initialSiteId = "", initialPosteId = "", initialPosteNom = "" }: FormPriseDePosteProps) {
  const { sites: availableSites } = useSites();
  const [siteId, setSiteId] = useState(initialSiteId);
  const [siteDeTravail, setSiteDeTravail] = useState("");
  const [posteId, setPosteId] = useState(initialPosteId);
  const [postes, setPostes] = useState<{ id: string; nom: string }[]>([]);
  const [employees, setEmployees] = useState<RegisterEmployeeOption[]>([]);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<RegisterEmployeeOption | null>(null);
  const [showEmployeeOptions, setShowEmployeeOptions] = useState(false);
  const [highlightedEmployee, setHighlightedEmployee] = useState(0);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [shiftType, setShiftType] = useState<"JOUR" | "NUIT">("JOUR");
  const [notes, setNotes] = useState("");
  const [loadingCrew, setLoadingCrew] = useState(false);
  const posteIsPreselected = Boolean(initialPosteId);

  useEffect(() => {
    const selectedSite = availableSites.find((site) => site.id === initialSiteId)
      || availableSites.find((site) => site.id === siteId)
      || availableSites[0];
    if (!selectedSite) return;
    if (initialSiteId) setSiteId(initialSiteId);
    else if (!siteId) setSiteId(selectedSite.id);
    setSiteDeTravail(selectedSite.name);
  }, [initialSiteId, siteId, availableSites]);

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    setLoadingCrew(true);
    setEmployees([]);
    setSelectedEmployee(null);
    setEmployeeQuery("");
    setSelectedAgents([]);
    Promise.all([serviceApi.listShiftPosts(siteId), serviceApi.listRegisterEmployees(siteId)])
      .then(([availablePosts, availableEmployees]) => {
        if (!active) return;
        setPostes(availablePosts);
        const nextPostId = initialPosteId
          ? availablePosts.some((post) => post.id === initialPosteId) ? initialPosteId : ""
          : availablePosts.some((post) => post.id === posteId) ? posteId : availablePosts[0]?.id || "";
        setPosteId(nextPostId);
        setEmployees(availableEmployees);
      })
      .catch((error) => { if (active) console.error("Chargement des postes et agents impossible:", error); })
      .finally(() => { if (active) setLoadingCrew(false); });
    return () => { active = false; };
  }, [siteId, initialPosteId]);

  useEffect(() => {
    const selectedSite = availableSites.find((site) => site.id === siteId);
    if (selectedSite?.name) setSiteDeTravail(selectedSite.name);
  }, [siteId, availableSites]);

  const siteOptions = useMemo(() => availableSites.map((site) => ({ id: site.id, site: site.name })), [availableSites]);

  const matchingEmployees = useMemo(() => {
    const query = normalize(employeeQuery);
    if (!query) return employees.slice(0, 8);
    return employees.filter((employee) => normalize(`${employee.matricule} ${employee.firstName} ${employee.lastName} ${employee.prestataire || ""}`).includes(query)).slice(0, 8);
  }, [employeeQuery, employees]);

  const selectEmployee = (employee: RegisterEmployeeOption) => {
    setSelectedEmployee(employee);
    setEmployeeQuery(employee.matricule);
    setShowEmployeeOptions(false);
    setHighlightedEmployee(0);
    if (employee.siteId) setSiteId(employee.siteId);
    if (employee.siteName) setSiteDeTravail(employee.siteName);
    setSelectedAgents((current) => current.filter((matricule) => matricule.toUpperCase() !== employee.matricule.toUpperCase()));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEmployee || !siteId || !posteId) return;
    const posteNom = postes.find((post) => post.id === posteId)?.nom || initialPosteNom;
    const saved = await onStart({
      matricule: selectedEmployee.matricule,
      nom: selectedEmployee.lastName,
      prenom: selectedEmployee.firstName,
      prestataire: selectedEmployee.prestataire || "",
      site_de_travail: selectedEmployee.siteName || siteDeTravail,
      siteId: selectedEmployee.siteId || siteId,
      posteId,
      posteNom,
      shiftType,
      chefMatricule: selectedEmployee.matricule,
      agentMatricules: selectedAgents.filter((value) => value.toUpperCase() !== selectedEmployee.matricule.toUpperCase()),
      notes: notes.trim(),
    });
    if (!saved) return;
    setSelectedEmployee(null);
    setEmployeeQuery("");
    setShowEmployeeOptions(false);
    setNotes("");
    setSelectedAgents([]);
  };

  const currentPostName = postes.find((post) => post.id === posteId)?.nom || initialPosteNom;
  const otherEmployees = employees.filter((employee) => employee.matricule.toUpperCase() !== selectedEmployee?.matricule.toUpperCase());

  return (
    <Panel title="Nouvelle prise de poste">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Label htmlFor="shift-employee-search">Matricule de l’employé responsable *</Label>
          <Input
            id="shift-employee-search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showEmployeeOptions}
            aria-controls="shift-employee-options"
            autoComplete="off"
            value={employeeQuery}
            onFocus={() => setShowEmployeeOptions(true)}
            onChange={(event) => {
              setEmployeeQuery(event.target.value);
              setSelectedEmployee(null);
              setHighlightedEmployee(0);
              setShowEmployeeOptions(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && matchingEmployees.length) {
                event.preventDefault();
                setHighlightedEmployee((current) => (current + 1) % matchingEmployees.length);
                setShowEmployeeOptions(true);
              } else if (event.key === "ArrowUp" && matchingEmployees.length) {
                event.preventDefault();
                setHighlightedEmployee((current) => (current - 1 + matchingEmployees.length) % matchingEmployees.length);
              } else if (event.key === "Enter" && showEmployeeOptions && matchingEmployees[highlightedEmployee]) {
                event.preventDefault();
                selectEmployee(matchingEmployees[highlightedEmployee]);
              } else if (event.key === "Escape") setShowEmployeeOptions(false);
            }}
            placeholder="Tapez un matricule, un nom ou une lettre…"
            disabled={loadingCrew || !siteId}
          />
          {showEmployeeOptions && !selectedEmployee && <div id="shift-employee-options" role="listbox" aria-label="Employés actifs du site" className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {loadingCrew ? <p className="px-3 py-2 text-sm text-muted-foreground">Recherche des employés…</p>
              : matchingEmployees.length ? matchingEmployees.map((employee, index) => <button
                key={employee.id}
                type="button"
                role="option"
                aria-selected={index === highlightedEmployee}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectEmployee(employee)}
                className={`flex w-full flex-col items-start rounded px-3 py-2 text-left text-sm ${index === highlightedEmployee ? "bg-accent" : "hover:bg-accent/60"}`}
              ><span className="font-medium">{employee.matricule} · {employee.firstName} {employee.lastName}</span><span className="text-xs text-muted-foreground">{employee.prestataire || "Prestataire non renseigné"} · {employee.siteName || siteDeTravail}</span></button>)
              : <p className="px-3 py-2 text-sm text-muted-foreground">Aucun employé actif ne correspond à cette recherche.</p>}
          </div>}
          {selectedEmployee && <p className="mt-1 text-xs font-medium text-emerald-700">Employé sélectionné : {selectedEmployee.firstName} {selectedEmployee.lastName}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="shift-last-name">Nom</Label><Input id="shift-last-name" readOnly value={selectedEmployee?.lastName || ""} className="mt-1 bg-muted" /></div>
          <div><Label htmlFor="shift-first-name">Prénom</Label><Input id="shift-first-name" readOnly value={selectedEmployee?.firstName || ""} className="mt-1 bg-muted" /></div>
          <div><Label htmlFor="shift-provider">Prestataire</Label><Input id="shift-provider" readOnly value={selectedEmployee?.prestataire || ""} className="mt-1 bg-muted" /></div>
          <div><Label htmlFor="shift-site-name">Site de travail</Label><Input id="shift-site-name" readOnly value={selectedEmployee?.siteName || ""} className="mt-1 bg-muted" /></div>
        </div>

        {!initialSiteId && <SelecteursPoste
          sites={siteOptions}
          siteDeTravail={siteDeTravail}
          setSiteDeTravail={setSiteDeTravail}
          onSiteChange={(name, id) => { setSiteDeTravail(name); setSiteId(id); setSelectedEmployee(null); setEmployeeQuery(""); }}
        />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="poste-garde">Poste de garde *</Label>
            {posteIsPreselected ? <Input id="poste-garde" readOnly value={currentPostName} className="mt-1 bg-muted" /> : <select id="poste-garde" required value={posteId} onChange={(event) => setPosteId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={loadingCrew || !postes.length}>
              {!postes.length && <option value="">Aucun poste configuré</option>}
              {postes.map((post) => <option key={post.id} value={post.id}>{post.nom}</option>)}
            </select>}
          </div>
          <div>
            <Label htmlFor="shift-type">Service *</Label>
            <select id="shift-type" value={shiftType} onChange={(event) => setShiftType(event.target.value as "JOUR" | "NUIT")} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="JOUR">Jour</option><option value="NUIT">Nuit</option>
            </select>
          </div>
        </div>

        <fieldset className="space-y-2 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Autres agents présents (facultatif)</legend>
          {loadingCrew ? <p className="text-sm text-muted-foreground">Chargement des agents…</p> : otherEmployees.length ? <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
            {otherEmployees.map((employee) => <label key={employee.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60">
              <input type="checkbox" checked={selectedAgents.includes(employee.matricule)} onChange={(event) => setSelectedAgents((current) => event.target.checked ? [...current, employee.matricule] : current.filter((value) => value !== employee.matricule))} />
              <span>{employee.firstName} {employee.lastName} <span className="text-muted-foreground">· {employee.matricule}</span></span>
            </label>)}
          </div> : <p className="text-sm text-muted-foreground">Aucun autre agent actif n’est affecté à ce site.</p>}
        </fieldset>

        <div><Label htmlFor="shift-notes">Observations (facultatif)</Label><Textarea id="shift-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Matériel manquant, anomalie constatée…" className="mt-1" /></div>
        <Button type="submit" className="w-full" disabled={!selectedEmployee || !siteId || !posteId || loadingCrew}>Ouvrir le service</Button>
      </form>
    </Panel>
  );
}
