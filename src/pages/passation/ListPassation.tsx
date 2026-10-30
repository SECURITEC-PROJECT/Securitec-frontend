import { Empty, Panel } from "@/components/PageHeader";
import type { InventoryRow, RetainedDocument } from "./FormPassation";

interface Handover {
  id: string;
  agent_sortant_nom: string;
  agent_sortant_prenom: string;
  incoming_nom: string;
  incoming_prenom: string;
  equipment: string;
  ongoing_events: string;
  instructions: string;
  inventaire?: InventoryRow[];
  documents_retenus?: RetainedDocument[];
  confirmation_sortant?: boolean;
  confirmation_entrant?: boolean;
  confirmation_sortant_le?: string | null;
  confirmation_entrant_le?: string | null;
  poste_nom?: string;
  created_at: string;
}

interface ListPassationProps { handovers: Handover[] }

export default function ListPassation({ handovers }: ListPassationProps) {
  const fmtDate = (value: string | null | undefined) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : `${date.toLocaleDateString()} à ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <Panel title="Passations précédentes">
      {handovers.length ? <ul className="space-y-3">
        {handovers.map((handover) => {
          const outgoing = [handover.agent_sortant_prenom, handover.agent_sortant_nom].filter(Boolean).join(" ");
          const incoming = [handover.incoming_prenom, handover.incoming_nom].filter(Boolean).join(" ");
          return <li key={handover.id} className="space-y-2 rounded-md border p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2 font-medium"><span>{outgoing} → {incoming}</span><span className="font-mono text-xs text-muted-foreground">{fmtDate(handover.created_at)}</span></div>
            {handover.poste_nom && <p className="text-xs text-muted-foreground">{handover.poste_nom}</p>}
            <p className="text-xs">Validations : chef sortant {handover.confirmation_sortant ? `✓ (${fmtDate(handover.confirmation_sortant_le)})` : "en attente"} · chef entrant {handover.confirmation_entrant ? `✓ (${fmtDate(handover.confirmation_entrant_le)})` : "en attente"}</p>
            {!!handover.inventaire?.length && <div><p className="font-medium">Inventaire ({handover.inventaire.length})</p><ul className="ml-4 list-disc text-xs text-muted-foreground">{handover.inventaire.map((row, index) => <li key={`${row.designation}-${index}`}>{row.designation} — sortie : {row.quantiteSortie}, {row.etatSortie.toLowerCase()} · entrée : {row.quantiteEntree}, {row.etatEntree.toLowerCase()}{row.observation ? ` · ${row.observation}` : ""}</li>)}</ul></div>}
            {!!handover.documents_retenus?.length && <div><p className="font-medium">Pièces et courriers suivis ({handover.documents_retenus.length})</p><ul className="ml-4 list-disc text-xs text-muted-foreground">{handover.documents_retenus.map((row, index) => <li key={`${row.reference}-${index}`}>{row.type.toLowerCase()} {row.reference} — {row.description} (×{row.quantite}), détenu par {row.detenuPar}{row.destination ? ` · destination : ${row.destination}` : ""} · {row.restitue ? "restitué" : "à restituer"}</li>)}</ul></div>}
            {handover.equipment && <p><span className="text-muted-foreground">Précisions matériel :</span> {handover.equipment}</p>}
            {handover.ongoing_events && <p><span className="text-muted-foreground">En cours :</span> {handover.ongoing_events}</p>}
            {handover.instructions && <p><span className="text-muted-foreground">Consignes transmises :</span> {handover.instructions}</p>}
          </li>;
        })}
      </ul> : <Empty text="Aucune passation" />}
    </Panel>
  );
}
