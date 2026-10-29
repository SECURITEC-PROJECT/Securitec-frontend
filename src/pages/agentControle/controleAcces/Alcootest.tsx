import { Empty, PageHeader, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type AlcoholCheck } from "@/lib/service-api";
import { Pencil, Plus, Printer, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";

const FUNCTIONS = ["CR", "ADM", "Qualite", "Labo", "Maintenance", "Logistique", "Pile & Face", "Sécurité", "Pronete", "Néa"] as const;
type JobFunction = typeof FUNCTIONS[number];

type CheckForm = {
  date: string;
  heure: string;
  matricule: string;
  personne: string;
  demandeur: string;
  fonction: JobFunction;
  resultat: "Positif" | "Négatif";
  civilite: "Monsieur" | "Madame";
  typeAppareil: "Electronique" | "Ballon";
  tauxMesure: string;
  testeurNom: string;
  testeurMatricule: string;
  testeurFonction: string;
  temoinNom: string;
  temoinMatricule: string;
  temoinFonction: string;
  temoin2Nom: string;
  temoin2Matricule: string;
  temoin2Fonction: string;
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const emptyForm = (): CheckForm => ({
  date: today(),
  heure: currentTime(),
  matricule: "",
  personne: "",
  demandeur: "",
  fonction: "CR",
  resultat: "Négatif",
  civilite: "Monsieur",
  typeAppareil: "Electronique",
  tauxMesure: "",
  testeurNom: "",
  testeurMatricule: "",
  testeurFonction: "",
  temoinNom: "",
  temoinMatricule: "",
  temoinFonction: "",
  temoin2Nom: "",
  temoin2Matricule: "",
  temoin2Fonction: "",
});

const formatDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const formFromEntry = (entry: AlcoholCheck): CheckForm => ({
  date: entry.date.slice(0, 10),
  heure: entry.heure,
  matricule: entry.matricule || "",
  personne: entry.personne,
  demandeur: entry.demandeur || "",
  fonction: FUNCTIONS.includes(entry.fonction as JobFunction) ? entry.fonction as JobFunction : "CR",
  resultat: entry.resultat,
  civilite: entry.civilite || "Monsieur",
  typeAppareil: entry.typeAppareil || "Electronique",
  tauxMesure: entry.tauxMesure == null ? "" : String(entry.tauxMesure),
  testeurNom: entry.testeurNom || "",
  testeurMatricule: entry.testeurMatricule || "",
  testeurFonction: entry.testeurFonction || "",
  temoinNom: entry.temoinNom || "",
  temoinMatricule: entry.temoinMatricule || "",
  temoinFonction: entry.temoinFonction || "",
  temoin2Nom: entry.temoin2Nom || "",
  temoin2Matricule: entry.temoin2Matricule || "",
  temoin2Fonction: entry.temoin2Fonction || "",
});

function ProtocolSignature({
  title,
  subtitle,
  name,
  matricule,
  fonction,
  onNameChange,
  onMatriculeChange,
  onFonctionChange,
  functionOptions,
  requiredName,
  requiredMatricule,
  requiredFunction,
}: {
  title: string;
  subtitle: string;
  name: string;
  matricule: string;
  fonction: string;
  onNameChange: (value: string) => void;
  onMatriculeChange: (value: string) => void;
  onFonctionChange: (value: string) => void;
  functionOptions?: readonly string[];
  requiredName?: boolean;
  requiredMatricule?: boolean;
  requiredFunction?: boolean;
}) {
  return (
    <article className="protocol-signature min-w-[220px] border-r border-slate-700 last:border-r-0">
      <header className="min-h-14 border-b border-slate-700 bg-slate-200 px-2 py-2 text-center font-bold">
        {title}<br /><em className="font-normal">{subtitle}</em>
      </header>
      <div className="space-y-5 p-3">
        <p><strong>Nom & prénoms</strong> <em>(anarana sy fanampiny)</em><br /><Input required={requiredName} aria-label={`${title} nom et prénoms`} className="protocol-field w-full" value={name} onChange={(event) => onNameChange(event.target.value)} /></p>
        <p><strong>N° matricule</strong> <em>(laharana)</em><br /><Input required={requiredMatricule} aria-label={`${title} matricule`} className="protocol-field w-full" value={matricule} onChange={(event) => onMatriculeChange(event.target.value)} /></p>
        <p><strong>Fonction</strong> <em>(asa)</em><br />
          {functionOptions
            ? <select required={requiredFunction} aria-label={`${title} fonction`} className="protocol-field w-full" value={fonction} onChange={(event) => onFonctionChange(event.target.value)}><option value="">....................</option>{functionOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
            : <Input required={requiredFunction} aria-label={`${title} fonction`} className="protocol-field w-full" value={fonction} onChange={(event) => onFonctionChange(event.target.value)} />}
        </p>
        <p className="min-h-28 pt-3">
          <strong>Signature précédée de la mention « lu et approuvé »</strong>
          <br /><em>(sonia ialohavan’ny hoe « voavaky ary ekena »)</em>
        </p>
      </div>
    </article>
  );
}

export default function Alcootest() {
  const { sites, siteError } = useSites();
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [entries, setEntries] = useState<AlcoholCheck[]>([]);
  const [entriesSiteId, setEntriesSiteId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<CheckForm>(emptyForm);
  const [editing, setEditing] = useState<AlcoholCheck | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [printMode, setPrintMode] = useState<"protocol" | "registry" | null>(null);
  const site = useMemo(
    () => sites.find((item) => item.id === selectedSiteId) || sites[0],
    [sites, selectedSiteId],
  );
  const siteId = site?.id || "";
  const visibleEntries = entriesSiteId === siteId ? entries : [];
  const loading = Boolean(siteId) && entriesSiteId !== siteId;
  const normalizedSearch = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const filteredEntries = visibleEntries.filter((entry) =>
    [entry.date, formatDate(entry.date.slice(0, 10)), entry.heure, entry.matricule, entry.personne, entry.demandeur, entry.fonction, entry.resultat, entry.tauxMesure, entry.testeurNom, entry.temoinNom, entry.temoin2Nom]
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .includes(normalizedSearch),
  );

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    serviceApi.listAlcoholChecks(siteId)
      .then((rows) => {
        if (active) {
          setEntries(rows);
          setEntriesSiteId(siteId);
          setLoadError("");
        }
      })
      .catch((reason) => {
        if (active) {
          setEntries([]);
          setEntriesSiteId(siteId);
          setLoadError(reason instanceof Error ? reason.message : "Chargement des alcootests impossible.");
        }
      });
    return () => { active = false; };
  }, [siteId]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteId) {
      toast.error("Sélectionnez un site de travail.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        matricule: form.matricule.trim(),
        personne: form.personne.trim(),
        demandeur: form.demandeur.trim(),
        testeurNom: form.testeurNom.trim(),
        testeurMatricule: form.testeurMatricule.trim(),
        testeurFonction: form.testeurFonction.trim(),
        temoinNom: form.temoinNom.trim(),
        temoinMatricule: form.temoinMatricule.trim(),
        temoinFonction: form.temoinFonction.trim(),
        temoin2Nom: form.temoin2Nom.trim(),
        temoin2Matricule: form.temoin2Matricule.trim(),
        temoin2Fonction: form.temoin2Fonction.trim(),
        siteId,
      };
      const entry = editing
        ? await serviceApi.updateAlcoholCheck(editing.id, payload)
        : await serviceApi.createAlcoholCheck(payload);
      setEntries((current) => editing
        ? current.map((row) => row.id === entry.id ? entry : row)
        : [entry, ...current]);
      setEntriesSiteId(siteId);
      resetForm();
      toast.success(editing ? "Alcootest modifié." : "Alcootest enregistré.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (entry: AlcoholCheck) => {
    setEditing(entry);
    setForm(formFromEntry(entry));
  };

  const deleteEntry = async (entry: AlcoholCheck) => {
    if (!siteId) return;
    if (!(await confirmDeletion(`Supprimer le contrôle de ${entry.personne} (${entry.matricule}) ? Cette action est définitive.`))) return;
    setDeletingId(entry.id);
    try {
      await serviceApi.deleteAlcoholCheck(entry.id, siteId);
      setEntries((current) => current.filter((row) => row.id !== entry.id));
      if (editing?.id === entry.id) resetForm();
      toast.success("Alcootest supprimé.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = (mode: "protocol" | "registry") => {
    const originalTitle = window.document.title;
    window.document.title = mode === "protocol" ? "PROCES VERBAL D'ALCOOTEST" : "Registre des alcootests";
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
      setPrintMode(null);
    }, { once: true });
    setPrintMode(mode);
    window.requestAnimationFrame(() => window.print());
  };

  const printEntry = (entry: AlcoholCheck) => {
    setForm(formFromEntry(entry));
    handlePrint("protocol");
  };

  return (
    <div id="alcohol-check-page" data-print-mode={printMode || ""} className="space-y-6">
      <PageHeader title="Alcootest" subtitle="Enregistrement et suivi des contrôles d’alcoolémie du personnel." />
      <div className="max-w-xl space-y-1">
        <Label htmlFor="alcohol-check-site">Site concerné</Label>
        <select
          id="alcohol-check-site"
          value={siteId}
          onChange={(event) => {
            setSelectedSiteId(event.target.value);
            resetForm();
          }}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          disabled={sites.length <= 1}
        >
          {!sites.length && <option value="">Aucun site disponible</option>}
          {sites.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {siteError && <p className="text-sm text-destructive">{siteError}</p>}
      </div>

      {(loadError || (!siteId && !siteError)) && (
        <Panel title={loadError ? "Erreur de chargement" : "Site indisponible"}>
          <p className={loadError ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {loadError || "Aucun site actif n’est associé ou disponible pour ce compte."}
          </p>
        </Panel>
      )}

      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      <section id="alcohol-protocol-print" className="rounded-lg border bg-white p-5 text-slate-900 shadow-sm sm:p-8">
        <div className="mx-auto max-w-5xl">
          <header className="mb-6 text-center">
            <div className="mb-5 text-2xl font-black tracking-widest text-red-800">STAR ★</div>
            <h2 className="inline-block border-b-2 border-slate-900 pb-1 text-xl font-bold uppercase sm:text-2xl">PROCES VERBAL D’ALCOOTEST</h2>
          </header>
          <div className="space-y-5 text-sm leading-7 sm:text-base">
            <p>
              La date du <em>(androany faha)</em>{" "}
              <Input aria-label="Date du contrôle" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="protocol-field w-36" />
              {" "}à <em>(tamin’ny)</em>{" "}
              <Input aria-label="Heure du contrôle" type="time" required value={form.heure} onChange={(event) => setForm({ ...form, heure: event.target.value })} className="protocol-field w-28" />,
              {" "}un test alcool est fait à{" "}
              <select aria-label="Civilité" value={form.civilite} onChange={(event) => setForm({ ...form, civilite: event.target.value as CheckForm["civilite"] })} className="protocol-field">
                <option value="Monsieur">Monsieur</option><option value="Madame">Madame</option>
              </select>{" "}
              <em>(Andriamatoa / Ramatoa)</em> :
              <br /><Input aria-label="Nom de la personne testée" required maxLength={255} value={form.personne} onChange={(event) => setForm({ ...form, personne: event.target.value })} className="protocol-field ml-4 w-3/4 text-left uppercase" placeholder="................................................................................................" />
            </p>
            <p>
              Demandeur du contrôle <em>(personne ou service à l’origine de la demande)</em> :
              <Input aria-label="Demandeur du contrôle" maxLength={255} value={form.demandeur} onChange={(event) => setForm({ ...form, demandeur: event.target.value })} className="protocol-field ml-2 w-3/4 text-left" placeholder="................................................................................................" />
            </p>
            <p>
              Le résultat du test est{" "}
              <select aria-label="Résultat du test" value={form.resultat} onChange={(event) => setForm({ ...form, resultat: event.target.value as CheckForm["resultat"] })} className="protocol-field">
                <option value="Positif">Positif</option><option value="Négatif">Négatif</option>
              </select>{" "}
              <em>(Ny valin’ny fitsapana dia)</em>, appareil{" "}
              <select aria-label="Appareil utilisé" value={form.typeAppareil} onChange={(event) => setForm({ ...form, typeAppareil: event.target.value as CheckForm["typeAppareil"] })} className="protocol-field">
                <option value="Electronique">Electronique</option><option value="Ballon">Ballon</option>
              </select>{" "}
              <em>(Electronique / ballon)</em> avec un taux de{" "}
              <Input aria-label="Taux mesuré en grammes par litre" type="number" min="0" max="999.99" step="0.01" required value={form.tauxMesure} onChange={(event) => setForm({ ...form, tauxMesure: event.target.value })} className="protocol-field w-24" /> g/l
              <em> (miaraka amin’ny taha)</em>.
            </p>
            <p>
              Le test a été fait <strong>DEUX (02) FOIS DE SUITE</strong> et a toujours donné le résultat précité et ceci en présence de Monsieur / Madame
              <em> (indroa (02) mifanaraka no natao ny test ka nanome io valiny voalaza io foana ary izany dia teo anatrehan’Andriamatoa / Ramatoa)</em> :
              <br />1) <Input aria-label="Nom du témoin 1" maxLength={255} value={form.temoinNom} onChange={(event) => setForm({ ...form, temoinNom: event.target.value })} className="protocol-field w-4/5 text-left" placeholder="................................................................................................" />
              <br />2) <Input aria-label="Nom du témoin 2" maxLength={255} value={form.temoin2Nom} onChange={(event) => setForm({ ...form, temoin2Nom: event.target.value })} className="protocol-field w-4/5 text-left" placeholder="................................................................................................" />
            </p>
            <p className="font-semibold">Comme témoin(s) <em>(vavolombelona)</em> :</p>
          </div>
          <div className="mt-4 grid grid-cols-3 border border-slate-700 text-xs sm:text-sm">
            <ProtocolSignature title="LA PERSONNE TESTEE" subtitle="(olona natoa fitsapana)" name={form.personne} matricule={form.matricule} fonction={form.fonction}
              onNameChange={(value) => setForm({ ...form, personne: value })} onMatriculeChange={(value) => setForm({ ...form, matricule: value })} onFonctionChange={(value) => setForm({ ...form, fonction: value as JobFunction })}
              functionOptions={FUNCTIONS} requiredName requiredMatricule requiredFunction />
            <ProtocolSignature title="LA PERSONNE « TESTEUR »" subtitle="(olona nanao ny fitsapana)" name={form.testeurNom} matricule={form.testeurMatricule} fonction={form.testeurFonction}
              onNameChange={(value) => setForm({ ...form, testeurNom: value })} onMatriculeChange={(value) => setForm({ ...form, testeurMatricule: value })} onFonctionChange={(value) => setForm({ ...form, testeurFonction: value })}
              requiredName requiredFunction />
            <ProtocolSignature
              title="LE(S) TEMOIN(S)"
              subtitle="(vavolombelona)"
              name={[form.temoinNom, form.temoin2Nom].filter(Boolean).join(" / ")}
              matricule={[form.temoinMatricule, form.temoin2Matricule].filter(Boolean).join(" / ")}
              fonction={[form.temoinFonction, form.temoin2Fonction].filter(Boolean).join(" / ")}
              onNameChange={(value) => {
                const [temoinNom, temoin2Nom = ""] = value.split("/").map((part) => part.trim());
                setForm({ ...form, temoinNom, temoin2Nom });
              }}
              onMatriculeChange={(value) => {
                const [temoinMatricule, temoin2Matricule = ""] = value.split("/").map((part) => part.trim());
                setForm({ ...form, temoinMatricule, temoin2Matricule });
              }}
              onFonctionChange={(value) => {
                const [temoinFonction, temoin2Fonction = ""] = value.split("/").map((part) => part.trim());
                setForm({ ...form, temoinFonction, temoin2Fonction });
              }}
            />
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2 print:hidden">
            {editing && <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X /> Annuler</Button>}
            <Button type="button" variant="outline" disabled={!siteId || saving} onClick={() => handlePrint("protocol")}><Printer /> Imprimer le PV</Button>
            <Button type="submit" disabled={saving || !siteId}>
              {editing ? <Save /> : <Plus />}
              {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Enregistrer le procès-verbal"}
            </Button>
          </div>
        </div>
      </section>
      </form>

      <section id="alcohol-registry-print-area">
      <Panel title="Registre des alcootests">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 alcohol-registry-screen">
          <div className="relative min-w-[260px] flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Rechercher un alcootest"
              placeholder="Rechercher par date, matricule, personne, demandeur, fonction ou résultat…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-h-11 pl-9"
            />
          </div>
          <Button type="button" variant="outline" className="print:hidden" disabled={loading || !visibleEntries.length} onClick={() => handlePrint("registry")}>
            <Printer className="mr-2 h-4 w-4" /> Imprimer le registre
          </Button>
        </div>
        {filteredEntries.length ? (
          <div className="overflow-hidden rounded-lg border alcohol-registry-screen">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 z-10 bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="w-[12%] border-b px-3 py-3 font-medium">Date</th>
                    <th className="w-[10%] border-b px-3 py-3 font-medium">Heure</th>
                    <th className="w-[14%] border-b px-3 py-3 font-medium">Matricule</th>
                    <th className="w-[22%] border-b px-3 py-3 font-medium">Nom et prénom</th>
                    <th className="w-[16%] border-b px-3 py-3 font-medium">Fonction</th>
                    <th className="w-[13%] border-b px-3 py-3 font-medium">Résultat</th>
                    <th className="w-[10%] border-b px-3 py-3 font-medium">Taux g/l</th>
                    <th className="w-[13%] border-b px-3 py-3 font-medium">Demandeur</th>
                    <th className="w-[13%] border-b px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="align-top transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{formatDate(entry.date.slice(0, 10))}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heure}</td>
                      <td className="break-words px-3 py-3 font-mono text-xs">{entry.matricule || "—"}</td>
                      <td className="break-words px-3 py-3 font-medium">{entry.personne}</td>
                      <td className="break-words px-3 py-3">{entry.fonction || "—"}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${entry.resultat === "Positif" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                          {entry.resultat}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">{entry.tauxMesure ?? "—"}</td>
                      <td className="break-words px-3 py-3">{entry.demandeur || "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Modifier le test" title="Modifier le test" onClick={() => editEntry(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer le procès-verbal" title="Imprimer le procès-verbal" onClick={() => printEntry(entry)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Supprimer le test" title="Supprimer le test" disabled={deletingId === entry.id} onClick={() => void deleteEntry(entry)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <div className="alcohol-registry-screen"><Empty text={loading ? "Chargement des contrôles…" : visibleEntries.length ? "Aucun contrôle ne correspond à votre recherche." : "Aucun contrôle enregistré pour ce site."} /></div>}
        <div className="alcohol-registry-print hidden">
          <h1 className="mb-1 text-xl font-bold">Registre des alcootests</h1>
          <p className="mb-4 text-sm">Site : {site?.name || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
          <table>
            <thead>
              <tr>{["Date", "Heure", "Matricule", "Nom et prénom", "Fonction", "Résultat", "Taux (g/l)", "Demandeur"].map((heading) => <th key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.date.slice(0, 10))}</td>
                  <td>{entry.heure || "—"}</td>
                  <td>{entry.matricule || "—"}</td>
                  <td>{entry.personne || "—"}</td>
                  <td>{entry.fonction || "—"}</td>
                  <td>{entry.resultat || "—"}</td>
                  <td>{entry.tauxMesure ?? "—"}</td>
                  <td>{entry.demandeur || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      </section>
      <style>{`
        #alcohol-protocol-print .protocol-field {
          display: inline-block;
          height: auto;
          min-height: 1.6em;
          min-width: 70px;
          border: 0;
          border-bottom: 1px dotted #334155;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          padding: 0 2px;
          vertical-align: baseline;
          color: inherit;
          font: inherit;
        }
        #alcohol-protocol-print .protocol-field:focus {
          outline: 1px solid #94a3b8;
          outline-offset: 2px;
        }
        @media print {
          @page alcoholProtocol { size: A4 portrait; margin: 10mm; }
          @page alcoholRegistry { size: A4 landscape; margin: 12mm; }
          #alcohol-protocol-print .protocol-field {
            display: inline-block !important;
            min-height: 1.6em !important;
            border: 0 !important;
            border-bottom: 1px dotted #334155 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 2px !important;
            vertical-align: baseline !important;
            color: inherit !important;
            font: inherit !important;
          }
          .protocol-field::placeholder { color: #64748b !important; opacity: 1 !important; }
          body * { visibility: hidden !important; }
          #alcohol-check-page[data-print-mode="protocol"] { page: alcoholProtocol; }
          #alcohol-check-page[data-print-mode="registry"] { page: alcoholRegistry; }
          #alcohol-check-page[data-print-mode="protocol"] #alcohol-protocol-print,
          #alcohol-check-page[data-print-mode="protocol"] #alcohol-protocol-print * { visibility: visible !important; }
          #alcohol-check-page[data-print-mode="protocol"] #alcohol-protocol-print {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            min-width: 0 !important;
            border: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            font-size: 9pt !important;
          }
          #alcohol-check-page[data-print-mode="protocol"] #alcohol-protocol-print .protocol-signature {
            min-width: 0 !important;
          }
          #alcohol-check-page[data-print-mode="protocol"] #alcohol-protocol-print .protocol-signature > div {
            padding: 6px !important;
            font-size: 7.5pt !important;
          }
          #alcohol-check-page[data-print-mode="protocol"] #alcohol-protocol-print .protocol-signature header {
            min-height: 0 !important;
            padding: 6px !important;
            font-size: 8pt !important;
          }
          #alcohol-check-page[data-print-mode="registry"] #alcohol-registry-print-area,
          #alcohol-check-page[data-print-mode="registry"] #alcohol-registry-print-area * { visibility: visible !important; }
          #alcohol-check-page[data-print-mode="registry"] #alcohol-registry-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
          }
          .alcohol-registry-screen { display: none !important; }
          .alcohol-registry-print { display: block !important; }
          .alcohol-registry-print table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .alcohol-registry-print th, .alcohol-registry-print td { border: 1px solid #777; padding: 6px; text-align: left; vertical-align: top; }
          .alcohol-registry-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
