import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_URL, authHeaders } from "@/lib/api";
import { useEffect, useState } from "react";
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
}

export default function FormPriseDePoste({ onStart }: FormPriseDePosteProps) {
  const [matricule, setMatricule] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "valid" | "invalid">("idle");

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");

  const [prestataires, setPrestataires] = useState([]);
  const [sites, setSites] = useState([]);
  const [prestataire, setPrestataire] = useState("");
  const [siteDeTravail, setSiteDeTravail] = useState("");
  const [notes, setNotes] = useState("");
  const [siteId, setSiteId] = useState("");
  const [posteId, setPosteId] = useState("");
  const [postes, setPostes] = useState<{ id: string; nom: string }[]>([]);
  const [shiftType, setShiftType] = useState<"JOUR" | "NUIT">("JOUR");
  const [employees, setEmployees] = useState<RegisterEmployeeOption[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [loadingCrew, setLoadingCrew] = useState(false);

  // Charger les options depuis la base de données
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/options-prise-de-poste`, { headers: authHeaders(), signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Chargement des options impossible.");
        return data;
      })
      .then((data) => {
        if (data.prestataires?.length) {
          setPrestataires(data.prestataires);
          setPrestataire(data.prestataires[0].prestataire);
        }
        if (data.sites?.length) {
          setSites(data.sites);
          setSiteDeTravail(data.sites[0].site);
          setSiteId(data.sites[0].id);
        }
      })
      .catch((err) => { if (err.name !== "AbortError") console.error("Erreur chargement options:", err); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    setLoadingCrew(true);
    Promise.all([serviceApi.listShiftPosts(siteId), serviceApi.listRegisterEmployees(siteId)])
      .then(([availablePosts, availableEmployees]) => {
        if (!active) return;
        setPostes(availablePosts);
        setPosteId((current) => availablePosts.some((post) => post.id === current) ? current : availablePosts[0]?.id || "");
        setEmployees(availableEmployees);
      })
      .catch((error) => {
        if (active) console.error("Chargement des postes et agents impossible:", error);
      })
      .finally(() => { if (active) setLoadingCrew(false); });
    return () => { active = false; };
  }, [siteId]);

  // Vérification automatique du matricule
  useEffect(() => {
    const trimmed = matricule.trim();

    if (!trimmed) {
      setStatus("idle");
      setNom("");
      setPrenom("");
      return;
    }

    setStatus("verifying");
    const controller = new AbortController();
    let active = true;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/employes/${encodeURIComponent(trimmed)}`, {
          headers: authHeaders(), signal: controller.signal,
        });
        if (res.ok) {
          const employee = await res.json();
          setNom(employee.nom);
          setPrenom(employee.prenom);
          setStatus("valid");
        } else {
          setNom("");
          setPrenom("");
          setStatus("invalid");
        }
      } catch (error) {
        if (active) setStatus("invalid");
      }
    }, 400);

    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [matricule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "valid" || !siteId || !posteId) return;

    const saved = await onStart({
      matricule: matricule.trim(),
      nom: nom.trim(),
      prenom: prenom.trim(),
      prestataire,
      site_de_travail: siteDeTravail,
      siteId,
      posteId,
      posteNom: postes.find((post) => post.id === posteId)?.nom || "",
      shiftType,
      chefMatricule: matricule.trim(),
      agentMatricules: selectedAgents.filter((value) => value.toUpperCase() !== matricule.trim().toUpperCase()),
      notes: notes.trim(),
    });

    if (!saved) return;

    setMatricule("");
    setNom("");
    setPrenom("");
    setStatus("idle");
    setNotes("");
    setSelectedAgents([]);
  };

  const getInputStyles = () => {
    if (status === "valid") return "border-emerald-500 focus-visible:ring-emerald-500 bg-emerald-50/20";
    if (status === "invalid") return "border-red-500 focus-visible:ring-red-500 bg-red-50/20";
    return "";
  };

  return (
    <Panel title="Nouvelle prise de poste">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="matricule">Matricule de l'employé *</Label>
          <div className="relative mt-1">
            <Input
              id="matricule"
              required
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              placeholder="Ex: EMP001"
              className={`transition-colors ${getInputStyles()}`}
            />
          </div>

          {status === "verifying" && (
            <p className="text-xs text-muted-foreground mt-1">Vérification en cours...</p>
          )}
          {status === "invalid" && (
            <p className="text-xs text-red-500 font-medium mt-1">
              ✕ Ce matricule n'existe pas dans la base de données.
            </p>
          )}
          {status === "valid" && (
            <p className="text-xs text-emerald-600 font-medium mt-1">
              ✓ Employé identifié : {nom} {prenom}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" readOnly value={nom} className="mt-1 bg-muted" placeholder="Nom" />
          </div>
          <div>
            <Label htmlFor="prenom">Prénom</Label>
            <Input id="prenom" readOnly value={prenom} className="mt-1 bg-muted" placeholder="Prénom" />
          </div>
        </div>

        <SelecteursPoste
          prestataires={prestataires}
          sites={sites}
          prestataire={prestataire}
          setPrestataire={setPrestataire}
          siteDeTravail={siteDeTravail}
          setSiteDeTravail={setSiteDeTravail}
          onSiteChange={(siteName, id) => { setSiteDeTravail(siteName); setSiteId(id); setSelectedAgents([]); }}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="poste-garde">Poste de garde *</Label>
            <select id="poste-garde" required value={posteId} onChange={(event) => setPosteId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={loadingCrew || !postes.length}>
              {!postes.length && <option value="">Aucun poste configuré</option>}
              {postes.map((post) => <option key={post.id} value={post.id}>{post.nom}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="shift-type">Service *</Label>
            <select id="shift-type" value={shiftType} onChange={(event) => setShiftType(event.target.value as "JOUR" | "NUIT")} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="JOUR">Jour</option><option value="NUIT">Nuit</option>
            </select>
          </div>
        </div>

        <fieldset className="space-y-2 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Autres agents présents</legend>
          {loadingCrew ? <p className="text-sm text-muted-foreground">Chargement des agents…</p> : employees.filter((employee) => employee.matricule.toUpperCase() !== matricule.trim().toUpperCase()).length ? (
            <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
              {employees.filter((employee) => employee.matricule.toUpperCase() !== matricule.trim().toUpperCase()).map((employee) => (
                <label key={employee.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60">
                  <input type="checkbox" checked={selectedAgents.includes(employee.matricule)} onChange={(event) => setSelectedAgents((current) => event.target.checked ? [...current, employee.matricule] : current.filter((value) => value !== employee.matricule))} />
                  <span>{employee.firstName} {employee.lastName} <span className="text-muted-foreground">· {employee.matricule}</span></span>
                </label>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">Aucun autre agent actif n’est affecté à ce site.</p>}
        </fieldset>

        <div>
          <Label htmlFor="shift-notes">Observations</Label>
          <Textarea
            id="shift-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Matériel manquant, anomalie constatée…"
            className="mt-1"
          />
        </div>

        <Button type="submit" className="w-full" disabled={status !== "valid" || !siteId || !posteId || loadingCrew}>
          Valider la prise de poste
        </Button>
      </form>
    </Panel>
  );
}
