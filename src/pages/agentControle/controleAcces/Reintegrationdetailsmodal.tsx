import { Button } from "@/components/ui/button";

interface Props {
  perception: any;
  reintegration: any;
  onClose: () => void;
}

const val = (v: unknown) => (v !== null && v !== undefined && String(v).trim() !== "" ? String(v) : "—");

const fmtDate = (v?: string) =>
  v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

function Ligne({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export default function ReintegrationDetailsModal({ perception, reintegration, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 text-xs">
      <div className="bg-background rounded-lg p-5 w-full max-w-md space-y-4 shadow-lg border">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold text-primary">Détails : {perception.trousse_cle}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        <div className="space-y-1">
          <p className="font-semibold text-primary">Perception</p>
          <div className="rounded-md border bg-muted/20 px-3 py-1 divide-y">
            <Ligne label="Prise par" value={val(perception.personne_habilitee)} />
            <Ligne label="Rôle" value={val(perception.role_personne)} />
            <Ligne label="Lieu" value={val(perception.lieu)} />
            <Ligne label="Agent gardien" value={val(perception.agent_gardien)} />
            <Ligne label="Heure" value={val(perception.heure)} />
            <Ligne label="Enregistrée le" value={fmtDate(perception.created_at)} />
          </div>
        </div>

        <div className="space-y-1">
          <p className="font-semibold text-emerald-700">Réintégration</p>
          <div className="rounded-md border border-emerald-200 bg-emerald-50/30 px-3 py-1 divide-y">
            <Ligne label="Remise par" value={val(reintegration.personne_habilitee)} />
            <Ligne label="Rôle" value={val(reintegration.role_personne)} />
            <Ligne label="Agent gardien" value={val(reintegration.agent_gardien)} />
            <Ligne label="Heure" value={val(reintegration.heure)} />
            <Ligne label="Enregistrée le" value={fmtDate(reintegration.created_at)} />
          </div>
          <div className="rounded-md border px-3 py-2 mt-2">
            <p className="text-muted-foreground mb-1">Observation</p>
            <p className="font-medium whitespace-pre-wrap">{val(reintegration.observation)}</p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}
