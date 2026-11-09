import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type ChauffeurRecord } from "@/lib/service-api";
import type { VisitorRecord } from "@/types/visitor";
import { FileDown, FileUp, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { readXlsxRows } from "@/lib/read-xlsx";
import { exportXlsx } from "@/lib/export-xlsx";

type SiteType = "USINE" | "AGENCE";
type Draft = { key: string; date: string; time: string; name: string; cin: string; license: string; vehicle: string; plate: string; reason: string; notes: string; chauffeurId: string };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const clock = () => new Date().toTimeString().slice(0,5);
const newDraft = (): Draft => ({ key: `${Date.now()}-${Math.random()}`, date: today(), time: clock(), name: "", cin: "", license: "", vehicle: "", plate: "", reason: "", notes: "", chauffeurId: "" });
const norm = (s: string) => s.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g," ").toLocaleLowerCase("fr");

export default function TableauCarteGrise({ sites, canCreateSite, addSite, siteError, onSaved }: {
  sites: ReturnType<typeof useSites>["sites"];
  canCreateSite: boolean;
  addSite: ReturnType<typeof useSites>["addSite"];
  siteError: string;
  onSaved: (record: VisitorRecord) => void;
}) {
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<SiteType>("USINE");
  const selectedSite = sites.find((site) => site.name === siteName);
  const [driverState, setDriverState] = useState<{siteId:string; list:ChauffeurRecord[]; error:string}>({siteId:"",list:[],error:""});
  const chauffeurs = driverState.siteId === selectedSite?.id ? driverState.list : [];
  const loadingDrivers = Boolean(selectedSite?.id) && driverState.siteId !== selectedSite?.id;
  const driverError = driverState.siteId === selectedSite?.id ? driverState.error : "";
  const [rows, setRows] = useState<Draft[]>([newDraft()]);
  const [savingKey, setSavingKey] = useState("");
  const [activeKey, setActiveKey] = useState("");
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true; const siteId = selectedSite?.id;
    if (!siteId) return () => { active = false; };
    serviceApi.listChauffeurs(siteId).then(list => { if(active) setDriverState({siteId,list,error:""}); }).catch(error => {
      if(active) setDriverState({siteId,list:[],error:error instanceof Error ? error.message : "Chargement des chauffeurs impossible."});
    });
    return () => { active = false; };
  }, [selectedSite?.id]);

  const update = (key: string, field: keyof Draft, value: string) => setRows(current => current.map(row => row.key === key ? {...row,[field]:value} : row));
  const chooseDriver = (key: string, driver: ChauffeurRecord) => {
    setRows(current => current.map(row => row.key === key ? {...row,name:driver.nomPrenom,cin:driver.cin||"",license:driver.numeroPermis||"",vehicle:driver.vehicule||"",plate:driver.matricule||"",chauffeurId:driver.id} : row));
    setActiveKey("");
  };
  const changeName = (row: Draft, value: string) => {
    update(row.key,"name",value);
    setRows(current => current.map(item => item.key === row.key ? {...item,name:value,cin:"",license:"",vehicle:"",plate:"",chauffeurId:""} : item));
    setActiveKey(row.key); setActiveSuggestion(0);
    const exact = chauffeurs.filter(driver => norm(driver.nomPrenom) === norm(value));
    if(exact.length === 1) chooseDriver(row.key, exact[0]);
  };
  const saveRow = async (row: Draft) => {
    if (!selectedSite) { toast.error("Sélectionnez un site de travail."); return; }
    if (loadingDrivers) { toast.error("Veuillez attendre le chargement des fiches chauffeurs."); return; }
    if (driverError) { toast.error("Impossible de vérifier les chauffeurs enregistrés. Réessayez après le chargement."); return; }
    if (!row.name.trim()) { toast.error("Le nom du chauffeur est obligatoire."); return; }
    if (!row.license.trim() || !row.plate.trim()) { toast.error("Le permis et l'immatriculation sont obligatoires."); return; }
    setSavingKey(row.key);
    try {
      const record = await serviceApi.createVisitor({full_name:row.name.trim(),company:"",id_document:row.cin.trim().slice(-4),document_type:"CIN/Permis",host:row.name.trim(),reason:row.reason.trim()||"Vérification carte grise / permis de conduire",badge:"",vehicle:row.plate.trim().toUpperCase(),zone:"Contrôle",equipment:`Permis: ${row.license.trim()}, Véhicule: ${row.vehicle.trim()}, Observations: ${row.notes.trim()}`,siteName,siteType,entry_date:row.date,entry_time:row.time}) as VisitorRecord;
      onSaved(record); toast.success("Enregistrement carte grise / permis effectué");
      setRows(current => { const remaining=current.filter(item=>item.key!==row.key); return remaining.length ? remaining : [newDraft()]; });
    } catch(error) { toast.error(error instanceof Error ? error.message : "Enregistrement impossible"); }
    finally { setSavingKey(""); }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      if (!selectedSite) throw new Error("Sélectionnez d'abord le site de travail à utiliser pour les lignes importées.");
      if (loadingDrivers) throw new Error("Attendez la fin du chargement des chauffeurs avant l'importation.");
      if (driverError) throw new Error("Les chauffeurs du site n'ont pas pu être chargés. Réessayez avant l'importation.");
      const rows = await readXlsxRows(file);
      const normalized = (value: unknown) => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
      const headers = rows[0]?.map(normalized) || [];
      const findColumn = (...names: string[]) => headers.findIndex(header => names.includes(header));
      const col = {
        date: findColumn("date"), time: findColumn("heure", "heure de pointage"), name: findColumn("nom et prenom", "nom", "chauffeur"),
        cin: findColumn("cin"), license: findColumn("permis", "permis de conduire"), vehicle: findColumn("vehicule"),
        plate: findColumn("immatriculation", "matricule"), reason: findColumn("motif"), notes: findColumn("observations", "observation"),
      };
      if (col.name < 0 || col.license < 0 || col.plate < 0) throw new Error("Colonnes requises manquantes : Nom et prénom, Permis et Immatriculation.");
      const imported = rows.slice(1).filter(line => line.some(value => String(value ?? "").trim())).map(line => {
        const get = (index: number, fallback = "") => index < 0 ? fallback : String(line[index] ?? "").trim();
        const name = get(col.name);
        const driver = chauffeurs.find(item => norm(item.nomPrenom) === norm(name));
        return { ...newDraft(), date:get(col.date,today()), time:get(col.time,clock()), name:driver?.nomPrenom || name,
          cin:get(col.cin,driver?.cin||""), license:get(col.license,driver?.numeroPermis||""), vehicle:get(col.vehicle,driver?.vehicule||""),
          plate:get(col.plate,driver?.matricule||"").toUpperCase(), reason:get(col.reason), notes:get(col.notes), chauffeurId:driver?.id||"" };
      });
      if (!imported.length) throw new Error("Le fichier ne contient aucune ligne à importer.");
      const failures: string[] = [];
      let saved = 0;
      for (const [index, row] of imported.entries()) {
        if (!row.name.trim() || !row.license.trim() || !row.plate.trim()) { failures.push(`Ligne ${index + 2} : nom, permis ou immatriculation manquant.`); continue; }
        try {
          const record = await serviceApi.createVisitor({
            full_name: row.name.trim(), company: "", id_document: row.cin.trim().slice(-4), document_type: "CIN/Permis",
            host: row.name.trim(), reason: row.reason.trim() || "Vérification carte grise / permis de conduire", badge: "",
            vehicle: row.plate.trim().toUpperCase(), zone: "Contrôle",
            equipment: `Permis: ${row.license.trim()}, Véhicule: ${row.vehicle.trim()}, Observations: ${row.notes.trim()}`,
            siteName, siteType, entry_date: row.date, entry_time: row.time,
          }) as VisitorRecord;
          onSaved(record); saved += 1;
        } catch (error) {
          failures.push(`Ligne ${index + 2} : ${error instanceof Error ? error.message : "enregistrement impossible"}`);
        }
      }
      if (saved) toast.success(`${saved} ligne(s) importée(s) directement dans le registre.`);
      if (failures.length) toast.error(saved
        ? `${failures.length} ligne(s) non importée(s). Vérifiez le nom, le permis et l'immatriculation.`
        : failures.slice(0, 3).join(" "));
    } catch(error) { toast.error(error instanceof Error ? error.message : "Lecture du fichier impossible."); }
    finally { setImporting(false); }
  };
  const fields: Array<[keyof Draft,string,string]> = [["date","Date","date"],["time","Heure","time"],["cin","CIN","text"],["license","Permis *","text"],["vehicle","Véhicule","text"],["plate","Immatriculation *","text"],["reason","Motif","text"],["notes","Observations","text"]];
  return <section className="carte-grise-entry-panel rounded-lg border bg-card p-4 shadow-sm">
    <div className="carte-grise-entry-toolbar">
      <div><h2 className="carte-grise-panel-title font-semibold">Nouvelle vérification carte grise / permis</h2><p className="mt-1 text-xs text-muted-foreground">Saisissez les contrôles directement dans le tableau et enregistrez chaque ligne.</p><div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"><FileUp className="mr-2 h-4 w-4"/>{importing?"Importation…":"Importer dans le registre (Excel / CSV)"}<input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={importing} onChange={event=>{void importFile(event.target.files?.[0]);event.currentTarget.value="";}} /></label><Button type="button" variant="outline" size="sm" onClick={()=>exportXlsx("modele-carte-grise-permis.xlsx","Modèle contrôle",["Date","Heure","Nom et prénom","CIN","Permis","Véhicule","Immatriculation","Motif","Observations"],[])}><FileDown className="mr-2 h-4 w-4"/>Télécharger le modèle</Button></div></div>
      <div className="carte-grise-entry-site"><SitePicker id="carte-site" value={siteName} type={siteType} sites={sites} canCreate={canCreateSite} onAdd={addSite} onChange={(name,type)=>{setSiteName(name);setSiteType(type);setRows(current=>current.map(row=>({...row,name:"",cin:"",license:"",vehicle:"",plate:"",chauffeurId:""})));setActiveKey("");}} /></div>
    </div>
    {siteError && <p className="mt-2 text-sm text-destructive">{siteError}</p>}
    {driverError && <p role="alert" className="mt-2 text-sm text-destructive">{driverError}</p>}
    {selectedSite && !loadingDrivers && !driverError && !chauffeurs.length && <p className="mt-2 text-sm text-muted-foreground">Aucun chauffeur enregistré pour ce site.</p>}
    {loadingDrivers && <p className="mt-2 text-sm text-muted-foreground">Chargement des fiches chauffeurs…</p>}
    <div className="carte-grise-entry-scroll mt-4"><table className="carte-grise-entry-table"><thead><tr><th>#</th><th>Nom et prénom *</th>{fields.map(([field,label])=><th key={field}>{label}</th>)}<th>Action</th></tr></thead><tbody>{rows.map((row,index)=>{
      const matches=chauffeurs.filter(driver=>!norm(row.name)||norm(driver.nomPrenom).includes(norm(row.name))).slice(0,7);
      return <tr key={row.key}><td className="carte-grise-row-number">{index+1}</td><td className="carte-grise-name-cell"><div className="carte-grise-name-wrap"><Input value={row.name} onChange={e=>changeName(row,e.target.value)} onFocus={()=>setActiveKey(row.key)} onKeyDown={e=>{if(!matches.length)return;if(e.key==="ArrowDown"){e.preventDefault();setActiveSuggestion(i=>(i+1)%matches.length);}else if(e.key==="ArrowUp"){e.preventDefault();setActiveSuggestion(i=>(i-1+matches.length)%matches.length);}else if(e.key==="Enter"&&activeKey===row.key){e.preventDefault();if(matches[activeSuggestion])chooseDriver(row.key,matches[activeSuggestion]);}else if(e.key==="Escape")setActiveKey("");}} placeholder={loadingDrivers?"Chargement…":"Rechercher un chauffeur"} autoComplete="off" />{activeKey===row.key&&matches.length>0&&<div className="carte-grise-driver-menu">{matches.map((driver,i)=><button type="button" key={driver.id} className={i===activeSuggestion?"active":""} onMouseDown={e=>e.preventDefault()} onClick={()=>chooseDriver(row.key,driver)}>{driver.nomPrenom}{driver.matricule?` · ${driver.matricule}`:""}</button>)}</div>}</div></td>{fields.map(([field,,type])=><td key={field}><Input type={type} value={row[field] as string} required={field==="license"||field==="plate"} onChange={e=>update(row.key,field,e.target.value)} /></td>)}<td><div className="carte-grise-row-actions"><Button type="button" size="sm" disabled={savingKey!==""} onClick={()=>void saveRow(row)}><Save className="mr-1 h-3.5 w-3.5"/>{savingKey===row.key?"…":"Enregistrer"}</Button><Button type="button" size="icon" variant="ghost" aria-label="Supprimer la ligne" disabled={rows.length===1||savingKey!==""} onClick={()=>setRows(current=>current.filter(item=>item.key!==row.key))}><Trash2 className="h-4 w-4"/></Button></div></td></tr>;
    })}</tbody></table></div>
    <div className="mt-3 flex justify-end"><Button type="button" variant="outline" onClick={()=>setRows(current=>[...current,newDraft()])}><Plus className="mr-2 h-4 w-4"/>Nouvelle ligne</Button></div>
  </section>;
}
