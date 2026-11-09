import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VehicleMovement } from "@/lib/service-api";
import { serviceApi } from "@/lib/service-api";
import { Download, FileUp, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { readXlsxRows } from "@/lib/read-xlsx";
import { exportXlsx } from "@/lib/export-xlsx";

type VehicleCategory = "Particulier" | "Star";
interface MovementRow {
  key: string;
  id?: string;
  date: string;
  plate: string;
  ownerName: string;
  category: VehicleCategory;
  passengersEntry: string;
  entryTime: string;
  passengersOut: string;
  exitDate: string;
  exitTime: string;
}

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const currentTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
const newRow = (): MovementRow => ({
  key: `${Date.now()}-${Math.random()}`, date: today(), plate: "", ownerName: "", category: "Particulier",
  passengersEntry: "1", entryTime: currentTime(), passengersOut: "", exitDate: today(), exitTime: "",
});
const vehicleHeaders = ["Date entree", "Matricule du vehicule", "Proprietaire (prenom)", "Type de proprietaire", "Personnes entree", "Heure entree", "Date sortie", "Personnes sortie", "Heure sortie"];
const normalizeHeader = (value: unknown) => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/\s+/g, " ");
const parseExcelDate = (raw: string) => {
  const value = raw.trim();
  if (/^\d+(\.\d+)?$/.test(value) && Number(value) > 20000) return new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(value)) * 86400000).toISOString().slice(0, 10);
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const fr = value.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  if (fr) return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  return "";
};
const parseExcelTime = (raw: string) => {
  const value = raw.trim();
  if (/^\d+(\.\d+)?$/.test(value) && Number(value) >= 0 && Number(value) < 1) {
    const minutes = Math.round(Number(value) * 1440) % 1440;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : value;
};
const rowFromVehicle = (vehicle: VehicleMovement): MovementRow => ({
  key: `edit-${vehicle.id}`, id: vehicle.id, date: vehicle.entryDate, plate: vehicle.plate, ownerName: vehicle.ownerName,
  category: vehicle.category === "Star" ? "Star" : "Particulier", passengersEntry: String(vehicle.passengersEntry ?? ""),
  entryTime: vehicle.entryTime, passengersOut: vehicle.passengersOut == null ? "" : String(vehicle.passengersOut),
  exitDate: vehicle.exitDate || vehicle.entryDate, exitTime: vehicle.exitTime || "",
});

interface FormVehiculeProps {
  siteId: string;
  onSaved: (vehicle: VehicleMovement) => void;
  editingVehicle: VehicleMovement | null;
  onCancelEdit: () => void;
}

export default function FormVehicule({ siteId, onSaved, editingVehicle, onCancelEdit }: FormVehiculeProps) {
  const [rows, setRows] = useState<MovementRow[]>(() => [editingVehicle ? rowFromVehicle(editingVehicle) : newRow()]);
  const [savingKey, setSavingKey] = useState("");
  const [importing, setImporting] = useState(false);

  const update = (key: string, field: keyof MovementRow, value: string) => {
    setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row));
  };
  const removeRow = (key: string) => setRows((current) => {
    const removed = current.find((row) => row.key === key);
    if (removed?.id) onCancelEdit();
    const remaining = current.filter((row) => row.key !== key);
    return remaining.length ? remaining : [newRow()];
  });

  const save = async (row: MovementRow) => {
    if (!siteId) { toast.error("Selectionnez un site de travail."); return; }
    const entryCount = Number(row.passengersEntry);
    const exitCount = row.passengersOut === "" ? null : Number(row.passengersOut);
    if (!row.date || !row.entryTime || !row.plate.trim() || !row.ownerName.trim() || !Number.isInteger(entryCount) || entryCount < 0) {
      toast.error("Completez la date, l'immatriculation, le proprietaire et les informations d'entree.");
      return;
    }
    if ((row.exitTime && (exitCount == null || !Number.isInteger(exitCount) || exitCount < 0 || !row.exitDate)) || (!row.exitTime && exitCount != null)) {
      toast.error("Pour la sortie, renseignez ensemble la date, l'heure et le nombre de personnes.");
      return;
    }
    if (!row.id && row.exitTime && !navigator.onLine) {
      toast.error("Enregistrez d'abord l'entree. La sortie pourra etre saisie apres la synchronisation.");
      return;
    }
    setSavingKey(row.key);
    try {
      const payload = {
        date: row.date, plate: row.plate.trim().toUpperCase(), ownerName: row.ownerName.trim(), category: row.category,
        passengersEntry: entryCount, entryTime: row.entryTime, passengersOut: exitCount, exitDate: row.exitDate,
        exitTime: row.exitTime || null, siteId,
      };
      let vehicle = row.id ? await serviceApi.updateVehicle(row.id, payload) : await serviceApi.createVehicle(payload);
      if (!row.id && row.exitTime) {
        if (vehicle.id.startsWith("pending-")) {
          setRows((current) => current.map((item) => item.key === row.key ? { ...item, id: vehicle.id } : item));
          throw new Error("Entree mise en attente hors connexion. La sortie sera disponible apres synchronisation.");
        }
        setRows((current) => current.map((item) => item.key === row.key ? { ...item, id: vehicle.id } : item));
        vehicle = await serviceApi.updateVehicle(vehicle.id, payload);
      }
      onSaved(vehicle);
      setRows((current) => {
        const remaining = current.filter((item) => item.key !== row.key);
        return remaining.length ? remaining : [newRow()];
      });
      toast[vehicle.pendingSync ? "info" : "success"](vehicle.pendingSync
        ? "Mouvement enregistre sur cet appareil, en attente de synchronisation."
        : row.id ? "Mouvement vehicule modifie." : "Entree du vehicule enregistree.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSavingKey("");
    }
  };


  const importFile = async (file?: File) => {
    if (!file) return;
    if (!siteId) { toast.error("Selectionnez un site avant l'importation."); return; }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const headers = sheet[0]?.map(normalizeHeader) || [];
      const find = (...labels: string[]) => headers.findIndex((header) => labels.includes(header));
      const col = {
        date: find("date entree", "date", "entree"), plate: find("matricule du vehicule", "matricule vehicule", "immatriculation", "vehicule"),
        owner: find("proprietaire (prenom)", "proprietaire", "nom et prenom", "nom"),
        category: find("type de proprietaire", "type", "categorie"), entryCount: find("personnes entree", "nombre de personnes entree", "passagers entree"),
        entryTime: find("heure entree", "heure d'entree"), exitDate: find("date sortie"),
        exitCount: find("personnes sortie", "nombre de personnes sortie", "passagers sortie"), exitTime: find("heure sortie", "heure de sortie"),
      };
      if ([col.date, col.plate, col.owner, col.category, col.entryCount, col.entryTime].some((index) => index < 0)) {
        throw new Error("Colonnes obligatoires absentes. Utilisez le modele Excel du module.");
      }
      const dataRows = sheet.slice(1).filter((line) => line.some((value) => String(value ?? "").trim()));
      if (!dataRows.length) throw new Error("Le fichier ne contient aucune ligne a importer.");
      const failures: string[] = [];
      let savedCount = 0;
      for (const [index, line] of dataRows.entries()) {
        const get = (column: number) => column < 0 ? "" : String(line[column] ?? "").trim();
        const date = parseExcelDate(get(col.date));
        const entryTime = parseExcelTime(get(col.entryTime));
        const exitTimeRaw = get(col.exitTime);
        const exitTime = exitTimeRaw ? parseExcelTime(exitTimeRaw) : "";
        const exitDateRaw = get(col.exitDate);
        const exitDate = exitDateRaw ? parseExcelDate(exitDateRaw) : date;
        const count = Number(get(col.entryCount));
        const exitCountRaw = get(col.exitCount);
        const countOut = exitCountRaw ? Number(exitCountRaw) : null;
        const categoryValue = normalizeHeader(get(col.category));
        const category: VehicleCategory = categoryValue === "star" ? "Star" : "Particulier";
        if (!date || !/^\d{2}:\d{2}$/.test(entryTime) || !get(col.plate) || !get(col.owner) || !["star", "particulier"].includes(categoryValue) || !Number.isInteger(count) || count < 0 || (exitTime && (!exitDate || countOut == null || !Number.isInteger(countOut) || countOut < 0)) || (!exitTime && (countOut != null || Boolean(exitDateRaw)))) {
          failures.push(`Ligne ${index + 2}: donnees manquantes ou invalides.`);
          continue;
        }
        const payload = {
          date, plate: get(col.plate).toUpperCase(), ownerName: get(col.owner), category,
          passengersEntry: count, entryTime, passengersOut: countOut, exitDate, exitTime: exitTime || null, siteId,
        };
        try {
          let vehicle = await serviceApi.createVehicle(payload);
          onSaved(vehicle);
          if (exitTime) {
            if (vehicle.id.startsWith("pending-")) throw new Error("Entree en attente de synchronisation; la sortie sera a enregistrer ensuite.");
            vehicle = await serviceApi.updateVehicle(vehicle.id, payload);
            onSaved(vehicle);
          }
          savedCount += 1;
        } catch (error) {
          failures.push(`Ligne ${index + 2}: ${error instanceof Error ? error.message : "enregistrement impossible"}`);
        }
      }
      if (savedCount) toast.success(`${savedCount} mouvement(s) importe(s) dans le registre.`);
      if (failures.length) toast.error(failures.slice(0, 4).join(" "));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lecture du fichier impossible.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Panel title="Saisie des mouvements véhicule — tableau type Excel">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Saisissez les entrées et sorties directement dans les cellules, puis enregistrez chaque ligne.</p>
        <div className="flex flex-wrap gap-2">
          <label className={`inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted ${importing || !siteId ? "pointer-events-none opacity-50" : ""}`}>
            <FileUp className="mr-2 h-4 w-4" />{importing ? "Importation..." : "Importer Excel / CSV"}
            <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={importing || !siteId} onChange={(event) => { void importFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          </label>
          <Button type="button" variant="outline" onClick={() => exportXlsx("modele-mouvements-vehicules.xlsx", "Modele vehicules", vehicleHeaders, [])}>
            <Download className="mr-2 h-4 w-4" />Modele Excel
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="vehicle-entry-sheet w-full min-w-[1500px] text-left text-sm">
            <thead><tr>
              <th>#</th><th>Date entrée *</th><th>Matricule véhicule *</th><th>Propriétaire (prénom) *</th><th>Type *</th>
              <th>Personnes entrée *</th><th>Heure entrée *</th><th>Date sortie</th><th>Personnes sortie</th><th>Heure sortie</th><th>Action</th>
            </tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.key}>
              <td>{index + 1}</td>
              <td><Input aria-label="Date entrée" type="date" value={row.date} onChange={(event) => update(row.key, "date", event.target.value)} /></td>
              <td><Input aria-label="Matricule véhicule" value={row.plate} maxLength={50} onChange={(event) => update(row.key, "plate", event.target.value)} /></td>
              <td><Input aria-label="Propriétaire prénom" value={row.ownerName} maxLength={255} onChange={(event) => update(row.key, "ownerName", event.target.value)} /></td>
              <td><select aria-label="Type de propriétaire" value={row.category} onChange={(event) => update(row.key, "category", event.target.value as VehicleCategory)}><option value="Particulier">Particulier</option><option value="Star">Star</option></select></td>
              <td><Input aria-label="Nombre de personnes à l'entrée" type="number" min="0" max="10000" step="1" value={row.passengersEntry} onChange={(event) => update(row.key, "passengersEntry", event.target.value)} /></td>
              <td><Input aria-label="Heure entrée" type="time" value={row.entryTime} onChange={(event) => update(row.key, "entryTime", event.target.value)} /></td>
              <td><Input aria-label="Date sortie" type="date" value={row.exitDate} onChange={(event) => update(row.key, "exitDate", event.target.value)} /></td>
              <td><Input aria-label="Nombre de personnes à la sortie" type="number" min="0" max="10000" step="1" value={row.passengersOut} onChange={(event) => update(row.key, "passengersOut", event.target.value)} /></td>
              <td><Input aria-label="Heure sortie" type="time" value={row.exitTime} onChange={(event) => update(row.key, "exitTime", event.target.value)} /></td>
              <td><div className="flex items-center gap-1">
                <Button type="button" size="sm" disabled={Boolean(savingKey)} onClick={() => void save(row)}><Save className="mr-1 h-4 w-4" />{savingKey === row.key ? "..." : row.id ? "Modifier" : "Enregistrer"}</Button>
                <Button type="button" size="icon" variant="ghost" aria-label={row.id ? "Annuler la modification" : "Supprimer la ligne"} title={row.id ? "Annuler la modification" : "Supprimer la ligne"} disabled={(rows.length === 1 && !row.id) || Boolean(savingKey)} onClick={() => removeRow(row.key)}><Trash2 className="h-4 w-4" /></Button>
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex justify-end"><Button type="button" variant="outline" onClick={() => setRows((current) => [...current, newRow()])}><Plus className="mr-2 h-4 w-4" />Nouvelle ligne</Button></div>
        {!siteId && <p className="text-sm text-muted-foreground">Selectionnez un site pour enregistrer un mouvement.</p>}
      </div>
    </Panel>
  );
}
