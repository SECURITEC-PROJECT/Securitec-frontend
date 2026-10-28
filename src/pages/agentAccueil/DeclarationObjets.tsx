import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Printer, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import {
  serviceApi,
  type ObjectDeclarationData,
  type ObjectDeclarationRecord,
} from "@/lib/service-api";
import { toast } from "sonner";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const emptyData = (referenceNumber = ""): ObjectDeclarationData => ({
  date: today(),
  entryTime: currentTime(),
  exitTime: "",
  firstName: "",
  company: "",
  vehicleNumber: "",
  objects: "",
  entryAgent: "",
  exitAgent: "",
  referenceNumber,
});

const blankPrintData = (): ObjectDeclarationData => ({
  date: "",
  entryTime: "",
  exitTime: "",
  firstName: "",
  company: "",
  vehicleNumber: "",
  objects: "",
  entryAgent: "",
  exitAgent: "",
  referenceNumber: "",
});

const nextReferenceNumber = (records: ObjectDeclarationRecord[]) => {
  const usedNumbers = new Set(records
    .map((record) => Number(record.data.referenceNumber))
    .filter((number) => Number.isSafeInteger(number) && number > 0));
  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) nextNumber += 1;
  return nextNumber;
};

const formatDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const formatCreatedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("fr-FR");
};

function DeclarationField({
  label,
  value,
  onChange,
  type = "text",
  multiline = false,
  className = "",
  readOnly = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  multiline?: boolean;
  className?: string;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <label className={`declaration-field ${className}`}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          readOnly={readOnly}
          required={!readOnly && required}
          onChange={(event) => onChange?.(event.target.value)}
          className="declaration-input declaration-textarea"
          rows={3}
        />
      ) : (
        <input
          type={readOnly && (type === "time" || type === "date") ? "text" : type}
          value={value}
          readOnly={readOnly}
          required={!readOnly && required}
          onChange={(event) => onChange?.(event.target.value)}
          className="declaration-input"
        />
      )}
    </label>
  );
}

function DeclarationCopy({
  data,
  update,
  readOnly = false,
}: {
  data: ObjectDeclarationData;
  update?: <K extends keyof ObjectDeclarationData>(key: K, value: ObjectDeclarationData[K]) => void;
  readOnly?: boolean;
}) {
  const onChange = <K extends keyof ObjectDeclarationData>(key: K, value: ObjectDeclarationData[K]) => update?.(key, value);

  return (
    <article className="object-declaration-copy">
      <header className="declaration-header">
        <div className="declaration-brand"><span className="brand-mark">❖</span> STAR</div>
        <h2>FICHE OBJET À DÉCLARER {new Date().getFullYear()} N°</h2>
        <input
          aria-label="Numéro de référence de la fiche"
          className="declaration-reference"
          value={data.referenceNumber}
          readOnly
          required={!readOnly}
          onChange={(event) => onChange("referenceNumber", event.target.value)}
        />
      </header>

      <div className="declaration-body">
        <div className="declaration-details">
          <DeclarationField label="DATE" type="date" value={data.date} readOnly={readOnly} required onChange={(value) => onChange("date", value)} />
          <DeclarationField label="HEURE D’ENTRÉE" type="time" value={data.entryTime} readOnly={readOnly} required onChange={(value) => onChange("entryTime", value)} />
          <DeclarationField label="HEURE DE SORTIE" type="time" value={data.exitTime} readOnly={readOnly} required onChange={(value) => onChange("exitTime", value)} />
          <DeclarationField label="PRÉNOM" value={data.firstName} readOnly={readOnly} required onChange={(value) => onChange("firstName", value)} />
          <DeclarationField label="SOCIÉTÉ" value={data.company} readOnly={readOnly} required onChange={(value) => onChange("company", value)} />
          <DeclarationField label="N° VÉHICULE" value={data.vehicleNumber} readOnly={readOnly} required onChange={(value) => onChange("vehicleNumber", value)} />
        </div>

        <DeclarationField
          label="LISTE DES OBJETS À DÉCLARER À L’ENTRÉE"
          value={data.objects}
          readOnly={readOnly}
          multiline
          required
          className="declaration-objects"
          onChange={(value) => onChange("objects", value)}
        />

        <div className="declaration-signatures">
          <DeclarationField label="AGENT À L’ENTRÉE (Signature + prénom + matricule)" value={data.entryAgent} readOnly={readOnly} onChange={(value) => onChange("entryAgent", value)} />
          <DeclarationField label="AGENT À LA SORTIE (Signature + prénom + matricule)" value={data.exitAgent} readOnly={readOnly} onChange={(value) => onChange("exitAgent", value)} />
        </div>
      </div>

      <p className="declaration-note">NB : Fiche à remettre à l’agent de sécurité avant la sortie du site svp</p>
    </article>
  );
}

export default function DeclarationObjets() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [data, setData] = useState<ObjectDeclarationData>(() => emptyData("1"));
  const [records, setRecords] = useState<ObjectDeclarationRecord[]>([]);
  const [loadedSiteId, setLoadedSiteId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [printData, setPrintData] = useState<ObjectDeclarationData[] | null>(null);
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const siteId = site?.id || "";
  const loadingHistory = Boolean(siteId) && loadedSiteId !== siteId;

  const refreshHistory = async (targetSiteId: string) => {
    const entries = await serviceApi.listObjectDeclarations(targetSiteId);
    setRecords(entries);
    setLoadedSiteId(targetSiteId);
    return entries;
  };

  const filteredRecords = useMemo(() => {
    const query = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
    if (!query) return records;
    return records.filter((record) => [
      record.data.firstName,
      record.data.company,
      record.data.vehicleNumber,
      record.data.objects,
      record.data.referenceNumber,
      record.data.date,
      formatDate(record.data.date),
    ].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().includes(query));
  }, [records, search]);

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    serviceApi.listObjectDeclarations(siteId)
      .then((entries) => {
        if (active) {
          setRecords(entries);
          setData((current) => current.firstName || current.objects || editingId
            ? current
            : emptyData(String(nextReferenceNumber(entries))));
          setLoadedSiteId(siteId);
        }
      })
      .catch((error) => {
        if (active) {
          setRecords([]);
          setLoadedSiteId(siteId);
          toast.error(error instanceof Error ? error.message : "Chargement de l’historique impossible.");
        }
      });
    return () => { active = false; };
  }, [siteId, editingId]);

  useEffect(() => {
    if (!printData) return;
    const restore = () => setPrintData(null);
    window.addEventListener("afterprint", restore, { once: true });
    const frame = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", restore);
    };
  }, [printData]);

  const updateData = <K extends keyof ObjectDeclarationData>(key: K, value: ObjectDeclarationData[K]) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setData(emptyData(String(nextReferenceNumber(records))));
    setEditingId(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteId) {
      toast.error("Sélectionnez un site de travail.");
      return;
    }
    setSaving(true);
    try {
      const payload = { data, siteId };
      if (editingId) {
        await serviceApi.updateObjectDeclaration(editingId, payload);
      } else {
        await serviceApi.createObjectDeclaration(payload);
      }
      const refreshedRecords = await refreshHistory(siteId);
      setData(emptyData(String(nextReferenceNumber(refreshedRecords))));
      toast.success(editingId ? "Déclaration mise à jour dans l’historique." : "Déclaration enregistrée dans l’historique.");
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement ou actualisation impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editRecord = (record: ObjectDeclarationRecord) => {
    setData(record.data);
    setEditingId(record.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRecord = async (record: ObjectDeclarationRecord) => {
    if (!siteId || !window.confirm(`Supprimer la déclaration de ${record.data.firstName} ? Cette action est définitive.`)) return;
    setDeletingId(record.id);
    try {
      await serviceApi.deleteObjectDeclaration(record.id, siteId);
      const refreshedRecords = await refreshHistory(siteId);
      if (editingId === record.id) {
        setEditingId(null);
        setData(emptyData(String(nextReferenceNumber(refreshedRecords))));
      } else {
        setData((current) => ({ ...current, referenceNumber: String(nextReferenceNumber(refreshedRecords)) }));
      }
      toast.success("Déclaration supprimée de l’historique.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression ou actualisation impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const printBlankForms = () => {
    setPrintData(Array.from({ length: 3 }, blankPrintData));
  };

  const printLatestRecords = () => {
    if (records.length < 3) return;
    const latestThree = [...records]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 3)
      .sort(
      (left, right) => Number(left.data.referenceNumber) - Number(right.data.referenceNumber),
      );
    setPrintData(latestThree.map((record) => record.data));
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Déclaration objets" subtitle="Remplissez, enregistrez et imprimez la fiche de déclaration d’objets." />
      <div className="max-w-xl declaration-screen">
        <SitePicker
          id="object-declaration-site"
          value={selectedSiteName}
          type={site?.type || siteType}
          sites={sites}
          canCreate={canCreateSite}
          onAdd={addSite}
          onChange={(name, type) => {
            setSiteName(name);
            setSiteType(type);
            resetForm();
          }}
        />
        {siteError && <p className="mt-2 text-sm text-destructive">{siteError}</p>}
      </div>
      {!siteId ? (
        <Panel title="Site de travail"><p className="text-sm text-muted-foreground">Sélectionnez un site pour remplir et enregistrer une déclaration.</p></Panel>
      ) : (
        <>
          <Panel title={editingId ? "Modifier une déclaration enregistrée" : "Nouvelle déclaration"}>
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              <div className="declaration-toolbar flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Le numéro est attribué automatiquement. Imprimez ici trois fiches vierges.
                </p>
                <div className="ml-auto flex flex-wrap justify-end gap-2">
                  {editingId && <Button type="button" variant="outline" onClick={resetForm}><RotateCcw className="mr-2 size-4" />Nouvelle fiche</Button>}
                  <Button type="button" variant="outline" onClick={printBlankForms}>
                    <Printer className="mr-2 size-4" />Imprimer 3 fiches vierges A4
                  </Button>
                  <Button type="submit" disabled={saving || loadingHistory}>
                    <Save className="mr-2 size-4" />
                    {saving ? "Enregistrement…" : editingId ? "Mettre à jour" : "Enregistrer dans l’historique"}
                  </Button>
                </div>
              </div>
              <div className="declaration-sheet-wrap">
                <div className="declaration-sheet-screen">
                  <DeclarationCopy data={data} update={updateData} />
                </div>
              </div>
            </form>
          </Panel>

          <Panel title="Historique des déclarations">
            <div className="mb-4 flex flex-wrap items-center gap-3 declaration-screen">
              <div className="relative min-w-[260px] flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Rechercher dans l’historique"
                  placeholder="Rechercher prénom, société, véhicule ou objet…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-h-11 pl-9"
                />
              </div>
              <span className="text-sm text-muted-foreground">{filteredRecords.length} déclaration(s)</span>
              <Button
                type="button"
                variant="outline"
                disabled={records.length < 3 || loadingHistory}
                onClick={printLatestRecords}
              >
                <Printer className="mr-2 size-4" />Imprimer les 3 dernières ({records.length}/3)
              </Button>
            </div>
            {loadingHistory ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chargement de l’historique…</p>
            ) : records.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Aucune déclaration enregistrée pour ce site.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                    <tr>{["Date", "N°", "Prénom", "Société", "N° véhicule", "Objets", "Enregistré le", "Actions"].map((heading) => <th key={heading} className="border-b px-3 py-3">{heading}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="whitespace-nowrap px-3 py-3">{formatDate(record.data.date)}</td>
                        <td className="px-3 py-3">{record.data.referenceNumber || "—"}</td>
                        <td className="px-3 py-3">{record.data.firstName}</td>
                        <td className="px-3 py-3">{record.data.company || "—"}</td>
                        <td className="px-3 py-3">{record.data.vehicleNumber || "—"}</td>
                        <td className="max-w-xs truncate px-3 py-3">{record.data.objects}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs">{formatCreatedAt(record.updatedAt || record.createdAt)}</td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex gap-1">
                            <Button type="button" variant="ghost" size="icon" aria-label="Modifier la déclaration" title="Modifier" onClick={() => editRecord(record)}><Pencil className="size-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" aria-label="Supprimer la déclaration" title="Supprimer" className="text-destructive hover:text-destructive" disabled={deletingId === record.id} onClick={() => void deleteRecord(record)}><Trash2 className="size-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredRecords.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">Aucune déclaration ne correspond à la recherche.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {printData && (
        <div id="object-declaration-print" aria-hidden="true">
          {printData.map((item, index) => <DeclarationCopy key={`${item.referenceNumber}-${index}`} data={item} readOnly />)}
        </div>
      )}

      <style>{`
        .declaration-sheet-wrap { overflow: auto; padding: 8px; background: #e9edf2; }
        .declaration-sheet-screen { width: 100%; max-width: 190mm; margin: 0 auto; }
        .object-declaration-copy {
          box-sizing: border-box;
          display: flex;
          min-width: 0;
          flex-direction: column;
          border: 1px dashed #555;
          padding: 4mm;
          color: #172033;
          background: #fff;
          font: 9pt Arial, sans-serif;
        }
        .declaration-header {
          display: grid;
          grid-template-columns: 28mm 1fr 24mm;
          align-items: center;
          min-height: 12mm;
          margin-bottom: 3mm;
          padding: 1mm 2mm;
          background: #e7e7e7;
          font-weight: 700;
        }
        .declaration-brand { white-space: nowrap; font-size: 15pt; }
        .brand-mark { font-size: 10pt; }
        .declaration-header h2 { margin: 0; text-align: center; font-size: 10pt; }
        .declaration-reference {
          width: 100%;
          min-width: 0;
          border: 0;
          border-bottom: 1px dotted #555;
          background: transparent;
          font: inherit;
          text-align: center;
          outline: none;
        }
        .declaration-body { display: grid; grid-template-columns: 42% 1fr; gap: 2mm 4mm; }
        .declaration-details { display: grid; grid-template-columns: 1fr; gap: 1mm; }
        .declaration-field { display: grid; min-width: 0; grid-template-columns: minmax(0, 42%) minmax(0, 1fr); align-items: end; gap: 1mm; font-size: 7.5pt; }
        .declaration-field > span { font-weight: 600; }
        .declaration-input {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          min-height: 7mm;
          padding: 1mm;
          border: 0;
          border-bottom: 1px dotted #666;
          border-radius: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          outline: none;
        }
        .declaration-input:focus, .declaration-reference:focus { border-bottom: 1px solid #111; }
        .declaration-objects { min-height: 44mm; grid-template-columns: minmax(0, 1fr); align-items: start; }
        .declaration-textarea { flex: 1; min-height: 40mm; resize: vertical; line-height: 1.8; }
        .declaration-signatures { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 2mm; }
        .declaration-signatures .declaration-field { grid-template-columns: minmax(0, 48%) minmax(0, 1fr); }
        .declaration-signatures .declaration-input { min-height: 12mm; }
        .declaration-note { margin: auto 0 0; padding-top: 3mm; text-align: center; font-size: 7pt; }
        #object-declaration-print { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body * { visibility: hidden !important; }
          #object-declaration-print, #object-declaration-print * { visibility: visible !important; }
          #object-declaration-print {
            position: absolute !important;
            inset: 0 !important;
            display: grid !important;
            box-sizing: border-box !important;
            width: 210mm !important;
            height: 297mm !important;
            grid-template-rows: repeat(3, minmax(0, 1fr)) !important;
            gap: 2mm !important;
            padding: 6mm 8mm !important;
          }
          #object-declaration-print .object-declaration-copy {
            display: grid !important;
            grid-template-rows: auto minmax(0, 1fr) auto !important;
            min-height: 0 !important;
            overflow: hidden !important;
            padding: 2mm !important;
            break-inside: avoid !important;
          }
          #object-declaration-print .declaration-header { min-height: 9mm !important; margin-bottom: 1.5mm !important; padding: .5mm 1mm !important; }
          #object-declaration-print .declaration-header h2 { font-size: 8pt !important; }
          #object-declaration-print .declaration-brand { font-size: 11pt !important; }
          #object-declaration-print .declaration-body {
            min-height: 0 !important;
            grid-template-rows: minmax(0, 1fr) auto !important;
            gap: 1mm 3mm !important;
          }
          #object-declaration-print .declaration-details { gap: 0 !important; }
          #object-declaration-print .declaration-field { gap: .5mm !important; font-size: 6.5pt !important; }
          #object-declaration-print .declaration-input { min-height: 5mm !important; padding: .4mm !important; }
          #object-declaration-print .declaration-objects {
            min-height: 0 !important;
            grid-template-rows: auto minmax(0, 1fr) !important;
          }
          #object-declaration-print .declaration-textarea {
            height: 100% !important;
            min-height: 0 !important;
            resize: none !important;
            line-height: 1.8 !important;
          }
          #object-declaration-print .declaration-signatures { gap: 3mm !important; margin-top: 1mm !important; }
          #object-declaration-print .declaration-signatures .declaration-input { min-height: 8mm !important; }
          #object-declaration-print .declaration-note { padding-top: 1mm !important; font-size: 6pt !important; }
          #object-declaration-print .declaration-input,
          #object-declaration-print .declaration-reference {
            border-bottom-color: #777 !important;
          }
          .declaration-screen, .declaration-toolbar, .declaration-sheet-wrap { display: none !important; }
          * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
