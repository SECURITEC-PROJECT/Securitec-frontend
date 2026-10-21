import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, RefreshCw } from "lucide-react";
import GrilleCameras, { type CameraItem } from "./GrilleCameras";
import ModalAgrandissementCamera from "./ModalAgrandissementCamera";

type CameraForm = { name: string; streamUrl: string; zoneName: string; accessLevel: string };
const emptyForm: CameraForm = { name: "", streamUrl: "", zoneName: "", accessLevel: "0" };

export default function Cameras() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [count, setCount] = useState("4");
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CameraItem | null>(null);
  const [editing, setEditing] = useState<CameraItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CameraForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites[0].id);
  }, [siteId, sites]);

  const refresh = useCallback(async () => {
    if (!siteId) { setCameras([]); setLoading(false); return; }
    try {
      const rows = await serviceApi.listCameras(siteId);
      setCameras(rows);
      setError("");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Chargement des caméras impossible.";
      setError(message);
      toast.error(message);
    } finally { setLoading(false); }
  }, [siteId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (camera: CameraItem) => {
    setEditing(camera);
    setForm({ name: camera.name, streamUrl: camera.streamUrl, zoneName: camera.zoneName, accessLevel: String(camera.accessLevel ?? 0) });
    setDialogOpen(true);
  };
  const saveCamera = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteId) { toast.error("Sélectionnez d’abord un site."); return; }
    setSaving(true);
    try {
      const payload = { ...form, siteId, accessLevel: Number(form.accessLevel) };
      if (editing) await serviceApi.updateCamera(editing.id, payload);
      else await serviceApi.createCamera(payload);
      setDialogOpen(false);
      toast.success(editing ? "Caméra mise à jour." : "Caméra ajoutée.");
      await refresh();
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Enregistrement de la caméra impossible."); }
    finally { setSaving(false); }
  };
  const toggleStatus = async (camera: CameraItem) => {
    const status = camera.status === "MAINTENANCE" ? "EN_SERVICE" : "MAINTENANCE";
    try {
      await serviceApi.setCameraStatus(camera.id, status);
      setCameras((current) => current.map((item) => item.id === camera.id ? { ...item, status } : item));
      setSelected((current) => current?.id === camera.id ? { ...current, status } : current);
      toast.success(status === "MAINTENANCE" ? "Caméra mise en maintenance." : "Caméra remise en service.");
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Modification de l’état impossible."); }
  };
  const deleteCamera = async (camera: CameraItem) => {
    if (!window.confirm(`Supprimer la caméra « ${camera.name} » ?`)) return;
    try {
      await serviceApi.deleteCamera(camera.id);
      setCameras((current) => current.filter((item) => item.id !== camera.id));
      setSelected((current) => current?.id === camera.id ? null : current);
      toast.success("Caméra supprimée.");
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Suppression de la caméra impossible."); }
  };

  return <div>
    <PageHeader title="Mur caméras" subtitle="Flux configurés par site · Actualisation automatique toutes les 30 secondes" action={<div className="flex flex-wrap items-center gap-2">
      <select aria-label="Site des caméras" value={siteId} onChange={(event) => setSiteId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
        {!sites.length && <option value="">Aucun site</option>}{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
      </select>
      <select aria-label="Nombre de caméras affichées" value={count} onChange={(event) => setCount(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
        {["1", "4", "8", "16"].map((value) => <option value={value} key={value}>{value} vue{value === "1" ? "" : "s"}</option>)}
      </select>
      <Button type="button" variant="outline" size="icon" title="Actualiser" aria-label="Actualiser les caméras" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" /></Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <Button type="button" onClick={openCreate} disabled={!siteId}><Camera className="mr-2 h-4 w-4" />Ajouter une caméra</Button>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier la caméra" : "Configurer une caméra"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void saveCamera(event)}>
            <div><Label htmlFor="camera-name">Nom de la caméra</Label><Input id="camera-name" required maxLength={255} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
            <div><Label htmlFor="camera-zone">Zone</Label><Input id="camera-zone" required maxLength={255} value={form.zoneName} onChange={(event) => setForm((current) => ({ ...current, zoneName: event.target.value }))} placeholder="Ex. Portail principal" /><p className="mt-1 text-xs text-muted-foreground">Une zone inconnue sera créée pour ce site.</p></div>
            <div><Label htmlFor="camera-access-level">Niveau d’accès requis pour une nouvelle zone</Label><Input id="camera-access-level" type="number" min="0" max="100" step="1" value={form.accessLevel} onChange={(event) => setForm((current) => ({ ...current, accessLevel: event.target.value }))} /><p className="mt-1 text-xs text-muted-foreground">Utilisé uniquement si cette zone n’existe pas encore sur le site.</p></div>
            <div><Label htmlFor="camera-stream">URL du flux</Label><Input id="camera-stream" type="url" required value={form.streamUrl} onChange={(event) => setForm((current) => ({ ...current, streamUrl: event.target.value }))} placeholder="https://…/stream.m3u8" /><p className="mt-1 text-xs text-muted-foreground">Flux navigateur : MP4 ou MJPEG (HLS selon le navigateur). Les flux RTSP nécessitent une passerelle web. Le navigateur doit aussi autoriser l’accès cross-origin.</p></div>
            <Button className="w-full" disabled={saving}>{saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Ajouter la caméra"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>} />
    {siteError && <p className="mb-3 text-sm text-destructive">{siteError}</p>}
    {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
    {loading ? <p className="py-10 text-center text-sm text-muted-foreground">Chargement des caméras…</p> : <GrilleCameras count={count} cameras={cameras} onSelect={setSelected} onEdit={openEdit} onStatus={(camera) => void toggleStatus(camera)} onDelete={(camera) => void deleteCamera(camera)} />}
    <ModalAgrandissementCamera selected={selected} onClose={() => setSelected(null)} />
  </div>;
}
