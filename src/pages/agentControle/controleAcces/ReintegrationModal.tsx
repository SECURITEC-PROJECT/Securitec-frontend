import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

interface CleMouvement {
  id: number;
  trousse_cle: string;
  personne_habilitee: string;
  role_personne?: string | null;
  lieu: string;
}

interface Props {
  cle: CleMouvement;
  onClose: () => void;
  onSubmit: (data: { memePersonne: boolean; reintegrateur: string; roleReintegrateur: string; agentGardien: string; obs: string }) => void;
}

export default function ReintegrationModal({ cle, onClose, onSubmit }: Props) {
  const [memePersonne, setMemePersonne] = useState(true);
  const [reintegrateur, setReintegrateur] = useState(cle.personne_habilitee);
  const [roleReintegrateur, setRoleReintegrateur] = useState(cle.role_personne ?? "");
  const [agentGardien, setAgentGardien] = useState("");
  const [obs, setObs] = useState("");

  const needsObs = !memePersonne && !obs.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 text-xs">
      <div className="bg-background rounded-lg p-5 w-full max-w-md space-y-4 shadow-lg border">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold text-primary">Réintégration : {cle.trousse_cle}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        <label className="flex items-center space-x-2 cursor-pointer bg-muted/40 p-2 rounded-md border">
          <input
            type="checkbox"
            checked={memePersonne}
            onChange={(e) => {
              setMemePersonne(e.target.checked);
              if (e.target.checked) {
                setReintegrateur(cle.personne_habilitee);
                setRoleReintegrateur(cle.role_personne ?? "");
              } else {
                setReintegrateur("");
                setRoleReintegrateur("");
              }
            }}
            className="rounded border-input h-4 w-4"
          />
          <span className="font-medium">Remis par la personne même qui l'a prise</span>
        </label>

        {!memePersonne && (
          <div className="space-y-2 p-2.5 border rounded-md bg-muted/10">
            <Label>Nom & Prénom (ou vide si perdue)</Label>
            <Input value={reintegrateur} onChange={(e) => setReintegrateur(e.target.value)} placeholder="Restitué par..." className="h-8 text-xs" />
            <Label>Rôle</Label>
            <Input readOnly value={roleReintegrateur} placeholder="Rôle automatique" className="h-8 text-xs bg-muted" />
          </div>
        )}

        <div className="space-y-1">
          <Label>Agent Gardien (Signataire)</Label>
          <Input required value={agentGardien} onChange={(e) => setAgentGardien(e.target.value)} placeholder="Matricule Agent" className="h-8 text-xs" />
        </div>

        <div className="space-y-1">
          <Label>Observation {!memePersonne && <span className="text-red-500 font-bold">* Obligatoire</span>}</Label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Précisez si tiers non habilité ou clé perdue..."
            className={`w-full rounded-md border p-2 text-xs bg-background h-16 ${needsObs ? "border-red-500 bg-red-50/20" : "border-input"}`}
          />
          {needsObs && (
            <p className="text-[10px] text-red-500 flex items-center font-medium">
              <AlertTriangle className="w-3 h-3 mr-1 inline" /> Veuillez mentionner le motif dans l'observation.
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" disabled={!agentGardien.trim() || needsObs} onClick={() => onSubmit({ memePersonne, reintegrateur, roleReintegrateur, agentGardien, obs })}>
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}
