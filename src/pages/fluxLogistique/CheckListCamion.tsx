import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { Check, LoaderCircle, Plus, Printer, RotateCcw, Search, Save, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

type CheckId = "starts" | "chocks" | "tires" | "leaks" | "cover" | "sideboards";
type CheckResult = "" | "OK" | "NOK";
type AccessDecision = "" | "Autorisé" | "Interdit";
const maxRows = 100;

interface TruckChecklistRow {
  id: number;
  vehicle: string;
  carrier: string;
  controlTime: string;
  checks: Record<CheckId, CheckResult>;
  signature: string;
  observation: string;
  decision: AccessDecision;
}

const checks: { id: CheckId; label: string }[] = [
  { id: "starts", label: "Mora velomina ve ilay kamiao? (Le camion démarre-t-il facilement)" },
  { id: "chocks", label: "Misy kaly roa farafahakeliny ary mbola tsara (Présence de 2 cales en bon état au minimum)" },
  { id: "tires", label: "Kodiarana tsy sola, tsy vaky, tsy mibontsina ary tsy malemy (Pneus non lisses, non crevés, pas d’hernie, pneus bien gonflés)" },
  { id: "leaks", label: "Tsy misy menaka/gasoil miraraka (Absence de fuite d’huile, gasoil)" },
  { id: "cover", label: "Misy labasy fiarovana ny sol @ menaka mitete" },
  { id: "sideboards", label: "Ridelle sy varavarana tsy simba ary mihidy tsara (Ridelle et porte en bon état)" },
];

const blankRow = (id: number): TruckChecklistRow => ({
  id,
  vehicle: "",
  carrier: "",
  controlTime: "",
  checks: { starts: "", chocks: "", tires: "", leaks: "", cover: "", sideboards: "" },
  signature: "",
  observation: "",
  decision: "",
});

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function CheckListCamion() {
  const { sites, siteError } = useSites();
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState(() => Array.from({ length: 8 }, (_, index) => blankRow(index + 1)));
  const nextRowId = useRef(9);
  const [isDirty, setIsDirty] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const selectedSite = sites.find((site) => site.id === selectedSiteId) || sites[0];

  const updateRow = (id: number, update: Partial<TruckChecklistRow>) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...update } : row));
    setIsDirty(true);
  };

  const updateCheck = (id: number, checkId: CheckId, result: CheckResult) => {
    setRows((current) => current.map((row) =>
      row.id === id ? { ...row, checks: { ...row.checks, [checkId]: result } } : row,
    ));
    setIsDirty(true);
  };

  const handleSearch = async () => {
    if (!selectedSite || !date) return;
    if (isDirty && !window.confirm("Les modifications non enregistrées seront perdues. Continuer ?")) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      const entry = await serviceApi.getTruckChecklist(selectedSite.id, date);
      setLoadedKey(`${selectedSite.id}:${date}`);
      if (entry) {
        const loadedRows = entry.rows.map((row, index) => ({ ...row, id: index + 1 }));
        setRows(loadedRows);
        nextRowId.current = loadedRows.length + 1;
        setFeedback({ message: `Fiche du ${new Date(`${entry.date}T00:00:00`).toLocaleDateString("fr-FR")} chargée.`, isError: false });
      } else {
        setRows(Array.from({ length: 8 }, (_, index) => blankRow(index + 1)));
        nextRowId.current = 9;
        setFeedback({ message: "Aucune fiche enregistrée pour cette date. Une nouvelle fiche est prête.", isError: false });
      }
      setIsDirty(false);
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "Impossible de rechercher la fiche.", isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSite || !date) return;
    if (!rows.length) {
      setFeedback({ message: "Ajoutez au moins une ligne avant d’enregistrer la fiche.", isError: true });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const currentKey = `${selectedSite.id}:${date}`;
      if (loadedKey !== currentKey) {
        const existing = await serviceApi.getTruckChecklist(selectedSite.id, date);
        if (existing && !window.confirm("Une fiche existe déjà pour cette date. Voulez-vous la remplacer ?")) return;
      }
      const saved = await serviceApi.saveTruckChecklist({
        siteId: selectedSite.id,
        date,
        rows: rows.map((row) => ({
          vehicle: row.vehicle,
          carrier: row.carrier,
          controlTime: row.controlTime,
          checks: row.checks,
          signature: row.signature,
          observation: row.observation,
          decision: row.decision,
        })),
      });
      setLoadedKey(currentKey);
      setIsDirty(false);
      setFeedback({ message: `Fiche du ${new Date(`${saved.date}T00:00:00`).toLocaleDateString("fr-FR")} enregistrée dans la base de données.`, isError: false });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "Impossible d’enregistrer la fiche.", isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = window.document.title;
    window.document.title = "CHECK-LIST CONTROLE SST ET ENVIRONNEMENT CAMION A L'ENTREE DU SITE";
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const resetSheet = () => {
    setRows((current) => current.map((row) => blankRow(row.id)));
    setIsDirty(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-list camion"
        subtitle="Contrôle SST et environnement des camions à l’entrée du site."
      />
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="truck-checklist-site">Site</Label>
            <select
              id="truck-checklist-site"
              value={selectedSite?.id || ""}
              onChange={(event) => setSelectedSiteId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={sites.length <= 1 || isLoading || isSaving}
            >
              {!sites.length && <option value="">Aucun site disponible</option>}
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
            {siteError && <p className="text-sm text-destructive">{siteError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="truck-checklist-date">Date de contrôle</Label>
            <Input id="truck-checklist-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={isLoading || isSaving} />
          </div>
          <Button type="button" variant="outline" onClick={handleSearch} disabled={!selectedSite || !date || isLoading || isSaving}>
            {isLoading ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Search className="mr-2 size-4" />}
            Rechercher par date
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={resetSheet} disabled={isLoading || isSaving}>
            <RotateCcw className="mr-2 size-4" /> Vider la fiche
          </Button>
          <Button type="button" variant="outline" onClick={() => {
            if (rows.length >= maxRows) {
              setFeedback({ message: `Une fiche ne peut pas dépasser ${maxRows} lignes.`, isError: true });
              return;
            }
            const id = nextRowId.current++;
            setRows((current) => [...current, blankRow(id)]);
            setIsDirty(true);
          }} disabled={rows.length >= maxRows || isLoading || isSaving}>
            <Plus className="mr-2 size-4" /> Ajouter une ligne
          </Button>
          <Button type="button" onClick={handleSave} disabled={!selectedSite || !date || isSaving || isLoading}>
            {isSaving ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Enregistrer
          </Button>
          <Button type="button" onClick={handlePrint} disabled={isLoading || isSaving}>
            <Printer className="mr-2 size-4" /> Imprimer la fiche
          </Button>
        </div>
      </div>
      {feedback && (
        <p role={feedback.isError ? "alert" : "status"} className={`text-sm print:hidden ${feedback.isError ? "text-destructive" : "text-muted-foreground"}`}>
          {feedback.isError ? null : <Check className="mr-1 inline size-4" />}
          {feedback.message}
        </p>
      )}

      <section id="truck-checklist-sheet" className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
        <header className="mb-4 border-b-2 border-slate-700 pb-3 text-center">
          <div className="mb-3 flex items-start justify-between text-xs font-semibold text-slate-600">
            <span className="rounded-full border-2 border-slate-600 px-3 py-1 tracking-widest">STAR</span>
          </div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-slate-900 sm:text-xl">
            CHECK-LIST CONTROLE SST ET ENVIRONNEMENT CAMION A L'ENTREE DU SITE
          </h1>
          <p className="mt-2 bg-sky-800 px-2 py-2 text-sm font-semibold uppercase text-white">
            IREO TEBOKA TSY MAINTSY ARAHI-MASO
            <br />
            (POINTS A CONTROLER)
          </p>
        </header>

        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="font-semibold">Date:</span>
          <span>{date ? new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR") : "—"}</span>
        </div>

        <fieldset disabled={isLoading || isSaving} className="contents">
        <div className="overflow-x-auto rounded-md border border-slate-500">
          <table className="w-full min-w-[1800px] border-collapse text-center text-xs text-slate-900">
            <thead>
              <tr>
                <th rowSpan={3} className="min-w-32 border border-slate-500 bg-slate-200 px-2 py-3">N° camion</th>
                <th rowSpan={3} className="min-w-36 border border-slate-500 bg-slate-200 px-2 py-3">TRANSPORTEUR</th>
                <th rowSpan={3} className="min-w-28 border border-slate-500 bg-slate-200 px-2 py-3">Ora fitsirihana<br />(Heure de contrôle)</th>
                <th colSpan={12} className="border border-slate-500 bg-sky-800 px-2 py-2 font-semibold uppercase tracking-wide text-white">
                  IREO TEBOKA TSY MAINTSY ARAHI-MASO
                  <br />
                  (POINTS A CONTROLER)
                </th>
                <th rowSpan={3} className="min-w-32 border border-slate-500 bg-slate-200 px-2 py-3">SONIA MPITSIRIKA<br />(Signature du contrôleur)</th>
                <th rowSpan={3} className="min-w-44 border border-slate-500 bg-slate-200 px-2 py-3">FANAMARIHANA<br />(Observation)</th>
                <th rowSpan={3} className="min-w-40 border border-slate-500 bg-slate-200 px-2 py-3">
                  FEPETRA NORASINA<br />(Décision prise)
                  <br /><br />
                  Accès autorisé (Afaka miditra)
                  <br />
                  Accès interdit (Tsy afaka miditra)
                </th>
                <th rowSpan={3} className="w-12 border border-slate-500 px-2 py-2 print:hidden">Action</th>
              </tr>
              <tr className="bg-slate-200">
                {checks.map((check) => (
                  <th key={check.id} colSpan={2} className="min-w-28 border border-slate-500 px-2 py-3 align-middle font-semibold leading-tight">
                    {check.label}
                  </th>
                ))}
              </tr>
              <tr className="bg-slate-100">
                {checks.flatMap((check) => [
                  <th key={`${check.id}-ok`} className="w-12 border border-slate-500 px-1 py-2">OK</th>,
                  <th key={`${check.id}-nok`} className="w-12 border border-slate-500 px-1 py-2">NOK</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="h-14 odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-500 p-1">
                    <input aria-label={`Camion ligne ${index + 1}`} value={row.vehicle} onChange={(event) => updateRow(row.id, { vehicle: event.target.value })} className="w-full min-w-28 bg-transparent px-1 py-2 text-center outline-none focus:bg-blue-50" />
                  </td>
                  <td className="border border-slate-500 p-1">
                    <input aria-label={`Transporteur ligne ${index + 1}`} value={row.carrier} onChange={(event) => updateRow(row.id, { carrier: event.target.value })} className="w-full min-w-32 bg-transparent px-1 py-2 text-center outline-none focus:bg-blue-50" />
                  </td>
                  <td className="border border-slate-500 p-1">
                    <input aria-label={`Heure de contrôle ligne ${index + 1}`} type="time" value={row.controlTime} onChange={(event) => updateRow(row.id, { controlTime: event.target.value })} className="w-full min-w-24 bg-transparent px-1 py-2 text-center outline-none focus:bg-blue-50" />
                  </td>
                  {checks.map((check) => (
                    (["OK", "NOK"] as const).map((result) => (
                      <td key={`${check.id}-${result}`} className="border border-slate-500 p-1">
                        <label className="flex h-full min-h-10 cursor-pointer items-center justify-center">
                          <input
                            type="radio"
                            name={`row-${row.id}-${check.id}`}
                            aria-label={`${check.label} ${result} ligne ${index + 1}`}
                            checked={row.checks[check.id] === result}
                            onChange={() => updateCheck(row.id, check.id, result)}
                            className="size-4 accent-blue-700"
                          />
                          <span className="sr-only">{result}</span>
                        </label>
                      </td>
                    ))
                  ))}
                  <td className="border border-slate-500 p-1">
                    <input aria-label={`Signature du contrôleur ligne ${index + 1}`} value={row.signature} onChange={(event) => updateRow(row.id, { signature: event.target.value })} className="w-full min-w-28 bg-transparent px-1 py-2 text-center outline-none focus:bg-blue-50" />
                  </td>
                  <td className="border border-slate-500 p-1">
                    <input aria-label={`Observation ligne ${index + 1}`} value={row.observation} onChange={(event) => updateRow(row.id, { observation: event.target.value })} className="w-full min-w-40 bg-transparent px-1 py-2 text-center outline-none focus:bg-blue-50" />
                  </td>
                  <td className="border border-slate-500 p-1">
                    <select aria-label={`FEPETRA NORASINA ligne ${index + 1}`} value={row.decision} onChange={(event) => updateRow(row.id, { decision: event.target.value as AccessDecision })} className="w-full min-w-36 bg-transparent px-1 py-2 text-center outline-none focus:bg-blue-50">
                      <option value="">—</option>
                      <option value="Autorisé">Afaka miditra</option>
                      <option value="Interdit">Tsy afaka miditra</option>
                    </select>
                  </td>
                  <td className="border border-slate-500 p-1 print:hidden">
                    <Button type="button" size="icon" variant="ghost" aria-label={`Supprimer la ligne ${index + 1}`} onClick={() => {
                      setRows((current) => current.filter((item) => item.id !== row.id));
                      setIsDirty(true);
                    }}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </fieldset>
      </section>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 5mm; }
          body * { visibility: hidden !important; }
          #truck-checklist-sheet, #truck-checklist-sheet * { visibility: visible !important; }
          #truck-checklist-sheet {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            border: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          #truck-checklist-sheet header { margin-bottom: 2mm !important; padding-bottom: 1mm !important; }
          #truck-checklist-sheet header h1 { font-size: 10pt !important; line-height: 1.15 !important; }
          #truck-checklist-sheet header p { margin-top: 1mm !important; padding: 1mm !important; font-size: 7pt !important; }
          #truck-checklist-sheet > div:nth-of-type(1) { margin-bottom: 1mm !important; font-size: 7pt !important; }
          #truck-checklist-sheet > div:nth-of-type(2) { overflow: visible !important; border-radius: 0 !important; }
          #truck-checklist-sheet table {
            min-width: 0 !important;
            width: 100% !important;
            table-layout: fixed !important;
            font-size: 5pt !important;
          }
          #truck-checklist-sheet th, #truck-checklist-sheet td {
            min-width: 0 !important;
            padding: 1px !important;
            overflow-wrap: anywhere !important;
            line-height: 1.05 !important;
          }
          #truck-checklist-sheet thead tr:first-child th { font-size: 5pt !important; }
          #truck-checklist-sheet thead tr:nth-child(2) th { font-size: 4.5pt !important; }
          #truck-checklist-sheet thead tr:nth-child(3) th { font-size: 5pt !important; }
          #truck-checklist-sheet thead tr:first-child th:nth-child(1) { width: 8% !important; }
          #truck-checklist-sheet thead tr:first-child th:nth-child(2) { width: 9% !important; }
          #truck-checklist-sheet thead tr:first-child th:nth-child(3) { width: 7% !important; }
          #truck-checklist-sheet thead tr:first-child th:nth-last-child(4) { width: 8% !important; }
          #truck-checklist-sheet thead tr:first-child th:nth-last-child(3) { width: 10% !important; }
          #truck-checklist-sheet thead tr:first-child th:nth-last-child(2) { width: 13% !important; }
          #truck-checklist-sheet input:not([type="radio"]), #truck-checklist-sheet select {
            width: 100% !important;
            min-width: 0 !important;
            padding: 0 !important;
            font-size: 5pt !important;
            line-height: 1 !important;
          }
          #truck-checklist-sheet input[type="radio"] {
            width: 8px !important;
            height: 8px !important;
            margin: 0 !important;
            appearance: auto !important;
          }
          #truck-checklist-sheet tr { height: 7mm !important; break-inside: avoid; }
          #truck-checklist-sheet tr { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
