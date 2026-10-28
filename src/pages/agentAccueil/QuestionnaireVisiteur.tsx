import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Printer, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import {
  serviceApi,
  type VisitorQuestionnaireAnswer,
  type VisitorQuestionnaireData,
  type VisitorQuestionnaireRecord,
} from "@/lib/service-api";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";

type QuestionId = "1" | "2" | "3" | "4" | "5" | "6";

const questionList: { id: QuestionId; text: string; section: "health" | "production" | "safety" }[] = [
  { id: "1", section: "health", text: "Moa nisy aretina toy ny tazo ianao tao anatin'izay 48 ora lasa izay?" },
  { id: "2", section: "health", text: "Moa nisy olona nifanerasera taminao tao anatin'izay 48 ora lasa izay nanana ny iray amin'ireto aretina ireto? Jaunisse, mivalana, mandoa, tazo, marary tenda na kohaka miharo tazo, ratra na fery manononitra, mitsiranoka amin'ny orona, sofina, maso." },
  { id: "3", section: "health", text: "Moa efa nisy soritr'aretina mifandraika amin'ny COVID-19 (tazo, kohaka, sempotra, mangeja, fangovitana miverimberina miaraka amina fanaintainana, fanaintainan'ny hozatra, aretin'andoha, fivalànana, areti-tenda, tsy fandrenesana tsiron-kanina) na aretina hafa azo ampifandraisina amin'ny Covid-19?" },
  { id: "4", section: "health", text: "Moa ve nisy fifandraisana tamin'ny olona mitondra ny COVID-19 ianao tato anatin'ny 7 andro lasa izay?" },
  { id: "5", section: "production", text: "Mitondra firavaka ve ianao? (Famantaranandro, rojo, kavina, peratra ankoatry ny alliance...)? Raha Eny no valiny dia mba esorina izany alohan'ny hidirana ao amin'ny faritra." },
  { id: "6", section: "safety", text: "Efa namaky ireo takelaka fampahafantarana momba ny Sécurité sy ny fahadiovana ireto ve ianao?" },
];

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const emptyData = (): VisitorQuestionnaireData => ({
  code: "BPH02",
  version: "",
  page: "1",
  firstName: "",
  lastName: "",
  factory: "",
  date: today(),
  reason: "",
  origin: "",
  originPlace: "",
  originOther: "",
  visitTime: "",
  entryTime: "",
  exitTime: "",
  answers: { "1": "", "2": "", "3": "", "4": "", "5": "", "6": "" },
  agreement: false,
  visitorSignature: "",
  securitySignature: "",
  managerSignature: "",
});

const formatDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const formatCreatedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("fr-FR");
};

function PaperField({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`paper-field ${className}`}>
      <span>{label}{required && <span className="questionnaire-screen"> *</span>}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="paper-input"
      />
    </label>
  );
}

export default function QuestionnaireVisiteur() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [data, setData] = useState<VisitorQuestionnaireData>(emptyData);
  const [records, setRecords] = useState<VisitorQuestionnaireRecord[]>([]);
  const [loadedSiteId, setLoadedSiteId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [printData, setPrintData] = useState<VisitorQuestionnaireData | null>(null);
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const siteId = site?.id || "";
  const loadingHistory = Boolean(siteId) && loadedSiteId !== siteId;

  const filteredRecords = useMemo(() => {
    const query = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
    if (!query) return records;
    return records.filter((record) => [
      record.data.firstName,
      record.data.lastName,
      record.data.factory,
      record.data.reason,
      record.data.date,
      record.siteName,
      formatDate(record.data.date),
    ].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().includes(query));
  }, [records, search]);

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    serviceApi.listVisitorQuestionnaires(siteId)
      .then((entries) => {
        if (active) {
          setRecords(entries);
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
  }, [siteId]);

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

  const updateData = <K extends keyof VisitorQuestionnaireData>(key: K, value: VisitorQuestionnaireData[K]) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setData(emptyData());
    setEditingId(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteId) {
      toast.error("Sélectionnez un site de travail.");
      return;
    }
    if (Object.values(data.answers).some((answer) => !answer)) {
      toast.error("Cochez « Eny » ou « Tsia » pour chacune des six questions.");
      return;
    }
    if (!data.origin) {
      toast.error("Précisez l’origine du visiteur.");
      return;
    }
    setSaving(true);
    try {
      const payload = { data, siteId };
      const saved = editingId
        ? await serviceApi.updateVisitorQuestionnaire(editingId, payload)
        : await serviceApi.createVisitorQuestionnaire(payload);
      setRecords((current) => editingId
        ? current.map((record) => record.id === saved.id ? saved : record)
        : [saved, ...current]);
      setLoadedSiteId(siteId);
      toast.success(editingId ? "Questionnaire mis à jour dans l’historique." : "Questionnaire enregistré dans l’historique.");
      setEditingId(saved.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editRecord = (record: VisitorQuestionnaireRecord) => {
    setData(record.data);
    setEditingId(record.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRecord = async (record: VisitorQuestionnaireRecord) => {
    if (!siteId || !(await confirmDeletion(`Supprimer le questionnaire de ${record.data.firstName} ${record.data.lastName} ? Cette action est définitive.`))) return;
    setDeletingId(record.id);
    try {
      await serviceApi.deleteVisitorQuestionnaire(record.id, siteId);
      setRecords((current) => current.filter((entry) => entry.id !== record.id));
      if (editingId === record.id) resetForm();
      toast.success("Questionnaire supprimé de l’historique.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const answerQuestion = (questionId: QuestionId, answer: Exclude<VisitorQuestionnaireAnswer, "">) => {
    setData((current) => ({ ...current, answers: { ...current.answers, [questionId]: answer } }));
  };

  const printCurrent = (recordData: VisitorQuestionnaireData) => {
    setPrintData(recordData);
  };

  const shownData = printData || data;
  const groupedQuestions = {
    health: questionList.filter((question) => question.section === "health"),
    production: questionList.filter((question) => question.section === "production"),
    safety: questionList.filter((question) => question.section === "safety"),
  };

  const renderQuestionTable = (questions: typeof questionList) => (
    <table className="question-table">
      <thead>
        <tr>
          <th className="question-instruction" colSpan={1}>Valiny</th>
          <th className="answer-heading">ENY</th>
          <th className="answer-heading">TSIA</th>
        </tr>
      </thead>
      <tbody>
        {questions.map((question) => (
          <tr key={question.id}>
            <td className="question-text"><span>{question.id}- </span>{question.text}</td>
            {(["ENY", "TSIA"] as const).map((answer) => (
              <td key={answer} className="answer-cell">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  aria-label={`Question ${question.id} : ${answer}`}
                  checked={shownData.answers[question.id] === answer}
                  onChange={() => !printData && answerQuestion(question.id, answer)}
                  disabled={Boolean(printData)}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Questionnaire visiteur BPH02"
        subtitle="Remplissez, enregistrez et consultez les questionnaires par site."
      />
      <div className="max-w-xl questionnaire-screen">
        <SitePicker
          id="questionnaire-site"
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
        <Panel title="Site de travail"><p className="text-sm text-muted-foreground">Sélectionnez un site pour remplir et enregistrer un questionnaire.</p></Panel>
      ) : (
        <>
          <Panel title={editingId ? "Modifier un questionnaire enregistré" : "Nouveau questionnaire"}>
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              <div className="questionnaire-toolbar flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Les pointillés du modèle sont remplacés par des champs. Les réponses se cochent une seule fois par question.</p>
                <div className="flex flex-wrap gap-2">
                  {editingId && <Button type="button" variant="outline" onClick={resetForm}><RotateCcw className="mr-2 size-4" />Nouveau</Button>}
                  <Button type="button" variant="outline" onClick={() => printCurrent(data)}><Printer className="mr-2 size-4" />Imprimer A4</Button>
                  <Button type="submit" disabled={saving || loadingHistory}>{saving ? "Enregistrement…" : <><Save className="mr-2 size-4" />{editingId ? "Mettre à jour" : "Enregistrer dans l’historique"}</>}</Button>
                </div>
              </div>
              <div className="questionnaire-sheet-wrap">
                <article id="questionnaire-print-sheet" className="questionnaire-sheet">
                  <header className="questionnaire-header">
                    <div className="star-brand">STAR</div>
                    <div className="questionnaire-title">QUESTIONNAIRE<br />VISITEUR</div>
                    <PaperField label="Code" value={shownData.code} onChange={(value) => updateData("code", value)} />
                    <PaperField label="Version" value={shownData.version} onChange={(value) => updateData("version", value)} />
                    <PaperField label="Date" value={shownData.date} type="date" onChange={(value) => updateData("date", value)} required />
                    <PaperField label="Page" value={shownData.page} onChange={(value) => updateData("page", value)} />
                  </header>

                  <div className="identity-grid">
                    <PaperField label="Anarana" value={shownData.firstName} onChange={(value) => updateData("firstName", value)} required className="wide-field" />
                    <PaperField label="Fanampiny" value={shownData.lastName} onChange={(value) => updateData("lastName", value)} required />
                    <PaperField label="Ozinina" value={shownData.factory} onChange={(value) => updateData("factory", value)} required />
                    <PaperField label="Daty" value={shownData.date} type="date" onChange={(value) => updateData("date", value)} required />
                    <PaperField label="Anton'ny fitsidihana" value={shownData.reason} onChange={(value) => updateData("reason", value)} required className="wide-field" />
                  </div>

                  <div className="origin-block">
                    <strong>Fiavian'ny mpitsidika :</strong>
                    <label className="origin-choice">
                      <input type="radio" name="origin" checked={shownData.origin === "MADAGASCAR"} onChange={() => updateData("origin", "MADAGASCAR")} disabled={Boolean(printData)} />
                      Madagasikara
                    </label>
                    <PaperField label="Toerana niaviana" value={shownData.originPlace} onChange={(value) => updateData("originPlace", value)} required={shownData.origin === "MADAGASCAR"} />
                    <label className="origin-choice">
                      <input type="radio" name="origin" checked={shownData.origin === "OTHER"} onChange={() => updateData("origin", "OTHER")} disabled={Boolean(printData)} />
                      Fanampiny
                    </label>
                    <PaperField label="Fiaviana hafa" value={shownData.originOther} onChange={(value) => updateData("originOther", value)} required={shownData.origin === "OTHER"} />
                  </div>

                  <div className="visit-time-grid">
                    <PaperField label="Ora fitsidihana" value={shownData.visitTime} onChange={(value) => updateData("visitTime", value)} />
                    <PaperField label="Fidirana" value={shownData.entryTime} type="time" onChange={(value) => updateData("entryTime", value)} />
                    <PaperField label="Fivoahana" value={shownData.exitTime} type="time" onChange={(value) => updateData("exitTime", value)} />
                  </div>

                  <p className="questionnaire-instruction">
                    Raha ENY no Valiny amin'ireto fanontaniana ireto dia mila ampandrenesina ny RQH na ny Directeur d'Usine mialohan'ny fitsidihana
                  </p>
                  {renderQuestionTable(groupedQuestions.health)}

                  <p className="questionnaire-section-note">Raha mitsidika na miasa amin'ny faritra famokarana</p>
                  {renderQuestionTable(groupedQuestions.production)}

                  <p className="questionnaire-section-note">Sécurité sy Fahadiovana</p>
                  {renderQuestionTable(groupedQuestions.safety)}

                  <label className="agreement-line">
                    <input type="checkbox" checked={shownData.agreement} onChange={(event) => updateData("agreement", event.target.checked)} disabled={Boolean(printData)} />
                    <span>Manaiky tokoa aho fa hanaraka ireo fitsipika momba ny Sécurité sy Fahadiovana manankery eto anivon'ny Brasseries STAR.</span>
                  </label>

                  <footer className="signature-grid">
                    <PaperField label="Ny mpitsidika" value={shownData.visitorSignature} onChange={(value) => updateData("visitorSignature", value)} />
                    <PaperField label="Ny agent de sécurité" value={shownData.securitySignature} onChange={(value) => updateData("securitySignature", value)} />
                    <PaperField label="Ny RQHSE na ny DU" value={shownData.managerSignature} onChange={(value) => updateData("managerSignature", value)} />
                  </footer>
                </article>
              </div>
            </form>
          </Panel>

          <Panel title="Historique des questionnaires">
            <div className="mb-4 flex flex-wrap items-center gap-3 questionnaire-screen">
              <div className="relative min-w-[260px] flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Rechercher dans l’historique"
                  placeholder="Rechercher nom, prénom, motif ou date…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-h-11 pl-9"
                />
              </div>
              <span className="text-sm text-muted-foreground">{filteredRecords.length} questionnaire(s)</span>
            </div>
            {loadingHistory ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chargement de l’historique…</p>
            ) : records.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Aucun questionnaire enregistré pour ce site.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                    <tr>{["Date", "Nom", "Prénom", "Motif", "Enregistré le", "Actions"].map((heading) => <th key={heading} className="border-b px-3 py-3">{heading}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="whitespace-nowrap px-3 py-3">{formatDate(record.data.date)}</td>
                        <td className="px-3 py-3">{record.data.lastName}</td>
                        <td className="px-3 py-3">{record.data.firstName}</td>
                        <td className="max-w-xs truncate px-3 py-3">{record.data.reason}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs">{formatCreatedAt(record.updatedAt || record.createdAt)}</td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex gap-1">
                            <Button type="button" variant="ghost" size="icon" aria-label="Imprimer le questionnaire" title="Imprimer en A4" onClick={() => printCurrent(record.data)}><Printer className="size-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" aria-label="Modifier le questionnaire" title="Modifier" onClick={() => editRecord(record)}><Pencil className="size-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" aria-label="Supprimer le questionnaire" title="Supprimer" className="text-destructive hover:text-destructive" disabled={deletingId === record.id} onClick={() => void deleteRecord(record)}><Trash2 className="size-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredRecords.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">Aucun questionnaire ne correspond à la recherche.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      <style>{`
        .questionnaire-sheet-wrap { overflow: auto; padding: 8px; background: #e9edf2; }
        .questionnaire-sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 12.35mm 17.64mm 15.88mm;
          color: #172033;
          background: #fff;
          box-shadow: 0 2px 12px #0002;
          font: 9pt Arial, sans-serif;
        }
        .questionnaire-header {
          display: grid;
          grid-template-columns: 1fr 2fr .7fr .7fr .8fr .6fr;
          align-items: center;
          border: 1px solid #222;
          margin-bottom: 4mm;
          min-height: 17mm;
        }
        .star-brand { text-align: center; font-weight: 800; font-size: 15pt; letter-spacing: .5px; }
        .questionnaire-title { text-align: center; font-weight: 700; font-size: 11pt; }
        .paper-field { display: flex; min-width: 0; flex-direction: column; gap: 1mm; color: #172033; font-size: 8pt; }
        .paper-field > span { font-weight: 600; }
        .paper-input {
          width: 100%;
          min-width: 0;
          min-height: 7mm;
          padding: 1mm 1.5mm;
          border: 0;
          border-bottom: 1px solid #aeb7c2;
          border-radius: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          outline: none;
        }
        .paper-input:focus { border-bottom: 1px solid #111; box-shadow: none; }
        .questionnaire-header .paper-field { align-self: stretch; justify-content: center; padding: 1mm; border-left: 1px solid #777; font-size: 6.5pt; }
        .questionnaire-header .paper-input { min-height: 5mm; padding: 0; }
        .identity-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 4mm; margin-bottom: 3mm; }
        .wide-field { grid-column: 1 / -1; }
        .origin-block { display: grid; grid-template-columns: auto 1fr auto 1fr; align-items: end; gap: 2mm 3mm; margin: 2mm 0; font-size: 8pt; }
        .origin-block > strong { grid-column: 1 / -1; }
        .origin-choice { display: flex; align-items: center; gap: 1.5mm; white-space: nowrap; }
        .origin-choice input, .agreement-line input { width: 4mm; height: 4mm; margin: 0; accent-color: #111; }
        .visit-time-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; margin: 2mm 0 3mm; }
        .questionnaire-instruction, .questionnaire-section-note { margin: 2mm 0 1mm; padding: 1.5mm 2mm; background: #e7e7e7; font-weight: 700; font-size: 7.5pt; }
        .question-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.4pt; }
        .question-table th, .question-table td { border: 1px solid #555; padding: 1mm 1.5mm; vertical-align: middle; }
        .question-table th { font-size: 7pt; }
        .question-instruction { width: auto; text-align: right; }
        .question-table th.answer-heading, .question-table td.answer-cell { width: 12mm; text-align: center; }
        .question-table td.question-text { line-height: 1.2; }
        .question-table .answer-cell input { appearance: none; width: 4mm; height: 4mm; margin: 0; border: 1px solid #222; vertical-align: middle; }
        .question-table .answer-cell input:checked::after { content: "X"; display: block; font-size: 9pt; font-weight: 700; line-height: 3.2mm; }
        .agreement-line { display: flex; align-items: flex-start; gap: 2mm; margin: 3mm 0; font-size: 7.5pt; font-weight: 600; }
        .signature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; margin-top: 6mm; }
        .signature-grid .paper-field { min-height: 15mm; justify-content: flex-end; }
        .signature-grid .paper-input { min-height: 9mm; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body * { visibility: hidden !important; }
          #questionnaire-print-sheet, #questionnaire-print-sheet * { visibility: visible !important; }
          #questionnaire-print-sheet {
            position: absolute !important;
            inset: 0 !important;
            display: block !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 12.35mm 17.64mm 15.88mm !important;
            box-shadow: none !important;
          }
          .questionnaire-screen, .questionnaire-toolbar { display: none !important; }
          .questionnaire-sheet-wrap { overflow: visible !important; padding: 0 !important; background: #fff !important; }
          .questionnaire-sheet { box-shadow: none !important; break-after: avoid-page; }
          .paper-input { min-height: 6mm; border-bottom-color: #888; }
          .paper-input:focus { border-bottom-color: #888; }
          .question-table .answer-cell input:checked::after { print-color-adjust: exact; }
          * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
