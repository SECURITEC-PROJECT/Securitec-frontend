import { Empty, Panel } from "@/components/PageHeader";
import type { InventoryRow, RetainedDocument } from "./FormPassation";
import { isWithinRegistryPeriod, RegistryPeriodExport } from "@/components/RegistryPeriodExport";
import { RegistryAuditHistory } from "@/components/RegistryAuditHistory";
import { useState } from "react";
import { RegistryAttachments } from "@/components/RegistryAttachments";

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
  site_id?: string | null;
  created_at: string;
}

interface ListPassationProps { handovers: Handover[] }

export default function ListPassation({ handovers }: ListPassationProps) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const filteredHandovers = handovers.filter((item) => isWithinRegistryPeriod(item.created_at, periodStart, periodEnd));
  const fmtDate = (value: string | null | undefined) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : `${date.toLocaleDateString()} à ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <Panel title="Passations précédentes">
      <div className="mb-4"><RegistryPeriodExport from={periodStart} to={periodEnd} onFromChange={setPeriodStart} onToChange={setPeriodEnd} records={filteredHandovers} filename="registre-passations" columns={[
        { label: "Date", value: (row) => row.created_at }, { label: "Poste", value: (row) => row.poste_nom },
        { label: "Chef sortant", value: (row) => `${row.agent_sortant_prenom} ${row.agent_sortant_nom}` },
        { label: "Chef entrant", value: (row) => `${row.incoming_prenom} ${row.incoming_nom}` },
        { label: "Inventaire", value: (row) => (row.inventaire || []).map((item) => `${item.designation}: ${item.quantiteSortie}/${item.etatSortie} → ${item.quantiteEntree}/${item.etatEntree}`).join(" | ") },
        { label: "Consignes", value: (row) => row.instructions },
        { label: "Pièces/courriers retenus", value: (row) => (row.documents_retenus || []).map((item) => `${item.type} ${item.reference} ×${item.quantite}`).join(" | ") },
      ]} /></div>
      {filteredHandovers.length ? <ul className="space-y-3">
        {filteredHandovers.map((handover) => {
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
            <RegistryAuditHistory entity="passation" recordId={handover.id} />
            <RegistryAttachments entity="passation" recordId={handover.id} siteId={handover.site_id} />
          </li>;
        })}
      </ul> : <Empty text={handovers.length ? "Aucune passation pour cette période" : "Aucune passation"} />}
    </Panel>
  );
}
