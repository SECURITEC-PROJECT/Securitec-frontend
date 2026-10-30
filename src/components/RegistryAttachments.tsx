import { Button } from "@/components/ui/button";
import { serviceApi } from "@/lib/service-api";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";

type Attachment = { id: string; documentId: string; name: string; extension: string; size: number; linkedAt: string };

export function RegistryAttachments({ entity, recordId, siteId }: { entity: string; recordId: string; siteId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const openList = async () => {
    const next = !open;
    setOpen(next);
    if (!next || loaded) return;
    await reload();
  };

  const reload = async () => {
    setBusy(true);
    setError("");
    try {
      setAttachments(await serviceApi.listRegistryAttachments(entity, recordId));
      setLoaded(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chargement des pièces jointes impossible.");
    } finally { setBusy(false); }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !siteId) {
      if (!siteId) toast.error("Ce registre n’est pas rattaché à un site : pièce jointe indisponible.");
      return;
    }
    setBusy(true);
    try {
      const document = await serviceApi.uploadDocument(siteId, file, "Pièce de registre");
      await serviceApi.linkRegistryAttachment(entity, recordId, document.id);
      setLoaded(false);
      await reload();
      toast.success("Pièce jointe ajoutée au registre.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Ajout de la pièce jointe impossible.");
    } finally { setBusy(false); }
  };

  const download = async (attachment: Attachment) => {
    try {
      const file = await serviceApi.downloadDocument(attachment.documentId);
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement("a"); link.href = url; link.download = file.name; link.click(); URL.revokeObjectURL(url);
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Téléchargement impossible."); }
  };

  const unlink = async (attachment: Attachment) => {
    try {
      await serviceApi.unlinkRegistryAttachment(attachment.id);
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
      toast.success("Pièce retirée de cette fiche. Le document reste dans la bibliothèque du site.");
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Retrait impossible."); }
  };

  return <div className="mt-1">
    <button type="button" className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline" onClick={() => void openList()}><Paperclip className="size-3" />Pièces jointes{loaded ? ` (${attachments.length})` : ""}</button>
    {open && <div className="mt-2 min-w-56 space-y-2 rounded border bg-background p-2 text-xs">
      <label className="inline-flex cursor-pointer items-center gap-1 text-primary"><Upload className="size-3" />Ajouter un fichier<input type="file" className="sr-only" disabled={busy || !siteId} onChange={(event) => void upload(event)} /></label>
      {busy && <p>Chargement…</p>}{error && <p className="text-destructive">{error}</p>}
      {loaded && attachments.length === 0 && <p className="text-muted-foreground">Aucune pièce jointe.</p>}
      {attachments.map((attachment) => <div key={attachment.id} className="flex items-center gap-2 border-t pt-2">
        <span className="min-w-0 flex-1 truncate" title={attachment.name}>{attachment.name}</span>
        <Button type="button" variant="ghost" size="icon" className="size-7" title="Télécharger" aria-label={`Télécharger ${attachment.name}`} onClick={() => void download(attachment)}><Download className="size-3" /></Button>
        <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive" title="Retirer de cette fiche" aria-label={`Retirer ${attachment.name}`} onClick={() => void unlink(attachment)}><Trash2 className="size-3" /></Button>
      </div>)}
    </div>}
  </div>;
}
