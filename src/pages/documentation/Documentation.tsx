import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { Download, FileText, Loader2, Search, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type SiteDocument = { id: string; name: string; extension: string; mimeType: string; size: number; category: string; createdAt: string };
const accept = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.odt,.ods";
const categories = ["Consigne", "Procédure", "Compte rendu", "Formulaire", "Autre"];
const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;

export default function Documentation() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [documents, setDocuments] = useState<SiteDocument[]>([]);
  const [category, setCategory] = useState(categories[0]);
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { if (!siteId && sites.length) setSiteId(sites[0].id); }, [siteId, sites]);

  const refresh = useCallback(async () => {
    if (!siteId) { setDocuments([]); return; }
    setLoading(true);
    setError("");
    try { setDocuments(await serviceApi.listDocuments(siteId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Chargement des documents impossible."); }
    finally { setLoading(false); }
  }, [siteId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const displayed = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return documents.filter((doc) => !query || `${doc.name} ${doc.category} ${doc.extension}`.toLocaleLowerCase("fr").includes(query));
  }, [documents, search]);

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !siteId) return;
    setError(""); setUploading(true);
    try {
      await serviceApi.uploadDocument(siteId, file, category);
      setFile(null);
      const input = document.getElementById("document-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Import du fichier impossible."); }
    finally { setUploading(false); }
  };

  const download = async (doc: SiteDocument, open = false) => {
    setWorkingId(doc.id); setError("");
    const viewer = open && doc.extension === "pdf" ? window.open("about:blank", "_blank") : null;
    try {
      const { blob, name } = await serviceApi.downloadDocument(doc.id);
      const url = URL.createObjectURL(blob);
      if (viewer) viewer.location.href = url;
      else {
        const link = document.createElement("a"); link.href = url; link.download = name; link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) { viewer?.close(); setError(reason instanceof Error ? reason.message : "Téléchargement impossible."); }
    finally { setWorkingId(""); }
  };

  const remove = async (doc: SiteDocument) => {
    if (!window.confirm(`Supprimer « ${doc.name} » ?`)) return;
    setWorkingId(doc.id); setError("");
    try { await serviceApi.deleteDocument(doc.id); setDocuments((current) => current.filter((item) => item.id !== doc.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Suppression impossible."); }
    finally { setWorkingId(""); }
  };

  return <div className="space-y-6">
    <PageHeader title="Documents du site" subtitle="Importez et consultez les documents partagés avec les équipes du site." />

    <section className="max-w-2xl space-y-4 rounded-lg border bg-card p-5">
      <h2 className="text-base font-semibold">Importer un document</h2>
      <form className="space-y-4" onSubmit={upload}>
        <div>
          <label htmlFor="document-site" className="mb-1 block text-sm font-medium">Site</label>
          <select id="document-site" value={siteId} onChange={(event) => setSiteId(event.target.value)} required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {!sites.length && <option value="">Aucun site disponible</option>}
            {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="document-category" className="mb-1 block text-sm font-medium">Catégorie</label>
            <select id="document-category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="document-file" className="mb-1 block text-sm font-medium">Fichier</label>
            <Input id="document-file" type="file" accept={accept} required disabled={!siteId || uploading} onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">PDF, Word, Excel, PowerPoint, CSV, texte et OpenDocument · 15 Mo maximum.</p>
        <Button type="submit" disabled={!file || !siteId || uploading}>{uploading ? <Loader2 className="animate-spin" /> : <Upload />} Importer le fichier</Button>
      </form>
    </section>

    {siteError && <p role="alert" className="text-sm text-destructive">{siteError}</p>}
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Fichiers disponibles <span className="text-sm font-normal text-muted-foreground">({documents.length})</span></h2>
        <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Rechercher un document" placeholder="Rechercher…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div>
      </div>
      <div className="divide-y rounded-lg border">
        {loading ? <p className="p-6 text-center text-sm text-muted-foreground">Chargement des documents…</p>
          : displayed.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">{documents.length ? "Aucun document ne correspond à la recherche." : "Aucun fichier importé pour ce site."}</p>
            : displayed.map((doc) => <article key={doc.id} className="flex flex-wrap items-center gap-3 p-4">
              <FileText className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={doc.name}>{doc.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{doc.category} · {doc.extension.toUpperCase()} · {formatSize(doc.size)} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(doc.createdAt))}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => void download(doc, true)} disabled={workingId === doc.id}>{workingId === doc.id ? <Loader2 className="animate-spin" /> : doc.extension === "pdf" ? "Consulter" : <><Download /> Télécharger</>}</Button>
              {doc.extension === "pdf" && <Button type="button" variant="ghost" size="icon" aria-label={`Télécharger ${doc.name}`} onClick={() => void download(doc)} disabled={workingId === doc.id}><Download /></Button>}
              <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer ${doc.name}`} onClick={() => void remove(doc)} disabled={workingId === doc.id}><Trash2 className="text-destructive" /></Button>
            </article>)}
      </div>
    </section>
  </div>;
}
