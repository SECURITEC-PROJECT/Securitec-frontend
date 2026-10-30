import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_URL, authHeaders } from "@/lib/api";
import { useEffect, useState, type FormEvent } from "react";
import SignaturePad from "./SignaturePad";

export type InventoryRow = {
  designation: string;
  quantiteSortie: number;
  etatSortie: string;
  quantiteEntree: number;
  etatEntree: string;
  observation: string;
};

export type RetainedDocument = {
  type: "PIECE" | "COURRIER" | "AUTRE";
  reference: string;
  description: string;
  quantite: number;
  detenuPar: string;
  destination: string;
  restitue: boolean;
};

export interface PassationFormData {
  incoming_matricule: string;
  incoming_prestataire: string;
  incoming_nom: string;
  incoming_prenom: string;
  equipment: string;
  ongoing_events: string;
  instructions: string;
  inventaire: InventoryRow[];
  documents_retenus: RetainedDocument[];
  confirmation_sortant: boolean;
  confirmation_entrant: boolean;
}

interface FormPassationProps {
  agentSortantNom?: string;
  agentSortantPrenom?: string;
  agentSortantMatricule?: string;
  onSubmit: (f: PassationFormData) => void;
}

const emptyInventory = (): InventoryRow => ({ designation: "", quantiteSortie: 1, etatSortie: "BON", quantiteEntree: 1, etatEntree: "BON", observation: "" });
const emptyDocument = (): RetainedDocument => ({ type: "PIECE", reference: "", description: "", quantite: 1, detenuPar: "", destination: "", restitue: false });

export default function FormPassation({ agentSortantNom = "", agentSortantPrenom = "", agentSortantMatricule = "", onSubmit }: FormPassationProps) {
  const [matricule, setMatricule] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "valid" | "invalid">("idle");
  const [nomMontant, setNomMontant] = useState("");
  const [prenomMontant, setPrenomMontant] = useState("");
  const [prestataireMontant, setPrestataireMontant] = useState("");
  const [equipment, setEquipment] = useState("");
  const [ongoingEvents, setOngoingEvents] = useState("");
  const [instructions, setInstructions] = useState("");
  const [inventory, setInventory] = useState<InventoryRow[]>([emptyInventory()]);
  const [documents, setDocuments] = useState<RetainedDocument[]>([]);
  const [outgoingSigned, setOutgoingSigned] = useState(false);
  const [incomingSigned, setIncomingSigned] = useState(false);

  useEffect(() => {
    const trimmed = matricule.trim();
    if (!trimmed) {
      setStatus("idle"); setNomMontant(""); setPrenomMontant(""); setPrestataireMontant("");
      return;
    }
    setStatus("verifying");
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/employes/${encodeURIComponent(trimmed)}`, { headers: authHeaders(), signal: controller.signal });
        if (!active) return;
        if (res.ok) {
          const employee = await res.json();
          setNomMontant(employee.nom ?? ""); setPrenomMontant(employee.prenom ?? ""); setPrestataireMontant(employee.prestataire ?? ""); setStatus("valid");
        } else {
          setNomMontant(""); setPrenomMontant(""); setPrestataireMontant(""); setStatus("invalid");
        }
      } catch { if (active) setStatus("invalid"); }
    }, 400);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [matricule]);

  const isFormValid = agentSortantNom.trim() !== "" && agentSortantPrenom.trim() !== "" && agentSortantMatricule.trim() !== "" && status === "valid" && outgoingSigned && incomingSigned && inventory.length > 0 && inventory.every((row) => row.designation.trim() && row.etatSortie && row.etatEntree && row.quantiteSortie >= 0 && row.quantiteEntree >= 0) && documents.every((row) => row.reference.trim() && row.description.trim() && row.detenuPar.trim());

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isFormValid) return;
    onSubmit({
      incoming_matricule: matricule.trim(), incoming_prestataire: prestataireMontant,
      incoming_nom: nomMontant.trim(), incoming_prenom: prenomMontant.trim(), equipment,
      ongoing_events: ongoingEvents, instructions, inventaire: inventory, documents_retenus: documents,
      confirmation_sortant: outgoingSigned, confirmation_entrant: incomingSigned,
    });
  };

  const updateInventory = (index: number, patch: Partial<InventoryRow>) => setInventory((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  const updateDocument = (index: number, patch: Partial<RetainedDocument>) => setDocuments((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row));

  return (
    <Panel title="Nouvelle passation">
      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="space-y-2 rounded-md border bg-muted/30 p-3">
          <h3 className="text-sm font-semibold">Chef sortant</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nom</Label><Input disabled value={agentSortantNom} className="mt-1 bg-background" /></div>
            <div><Label>Prénom</Label><Input disabled value={agentSortantPrenom} className="mt-1 bg-background" /></div>
          </div>
          <p className="text-xs text-muted-foreground">Matricule : {agentSortantMatricule || "non renseigné"}</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Chef entrant</h3>
          <div><Label htmlFor="matricule-montant">Matricule *</Label><Input id="matricule-montant" required value={matricule} onChange={(event) => setMatricule(event.target.value)} placeholder="ex. MAT-0001" className="mt-1" />
            {status === "verifying" && <p className="mt-1 text-xs text-muted-foreground">Vérification en cours…</p>}
            {status === "invalid" && <p className="mt-1 text-xs text-red-500">Ce matricule n'existe pas dans la base de données.</p>}
            {status === "valid" && <p className="mt-1 text-xs text-emerald-600">Agent identifié : {prenomMontant} {nomMontant}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Nom</Label><Input readOnly value={nomMontant} className="mt-1 bg-muted" /></div><div><Label>Prénom</Label><Input readOnly value={prenomMontant} className="mt-1 bg-muted" /></div></div>
        </section>

        <section className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">Inventaire contradictoire</h3><p className="text-xs text-muted-foreground">Quantité et état du matériel au départ et à la réception.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setInventory((rows) => [...rows, emptyInventory()])}>Ajouter un article</Button></div>
          {inventory.map((row, index) => <div key={index} className="space-y-2 rounded border p-3">
            <div className="flex justify-between gap-2"><Label>Article {index + 1}</Label>{inventory.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setInventory((rows) => rows.filter((_, i) => i !== index))}>Supprimer</Button>}</div>
            <Input required aria-label="Désignation" placeholder="Radio, clés, badge…" value={row.designation} onChange={(event) => updateInventory(index, { designation: event.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Quantité sortie</Label><Input type="number" min="0" required value={row.quantiteSortie} onChange={(event) => updateInventory(index, { quantiteSortie: Number(event.target.value) })} /><Label>État sortie</Label><select value={row.etatSortie} onChange={(event) => updateInventory(index, { etatSortie: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="BON">Bon</option><option value="ABIME">Abîmé</option><option value="MANQUANT">Manquant</option><option value="HORS_SERVICE">Hors service</option></select></div>
              <div className="space-y-1"><Label>Quantité entrée</Label><Input type="number" min="0" required value={row.quantiteEntree} onChange={(event) => updateInventory(index, { quantiteEntree: Number(event.target.value) })} /><Label>État entrée</Label><select value={row.etatEntree} onChange={(event) => updateInventory(index, { etatEntree: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="BON">Bon</option><option value="ABIME">Abîmé</option><option value="MANQUANT">Manquant</option><option value="HORS_SERVICE">Hors service</option></select></div>
            </div>
            <Input placeholder="Observation / écart constaté" value={row.observation} onChange={(event) => updateInventory(index, { observation: event.target.value })} />
          </div>)}
        </section>

        <section className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">Pièces et courriers retenus</h3><p className="text-xs text-muted-foreground">Suivez leur référence, leur détenteur et leur restitution.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setDocuments((rows) => [...rows, emptyDocument()])}>Ajouter une pièce / un courrier</Button></div>
          {documents.map((row, index) => <div key={index} className="space-y-2 rounded border p-3">
            <div className="flex justify-between"><Label>Élément retenu {index + 1}</Label><Button type="button" variant="ghost" size="sm" onClick={() => setDocuments((rows) => rows.filter((_, i) => i !== index))}>Supprimer</Button></div>
            <div className="grid grid-cols-2 gap-3"><select aria-label="Type" value={row.type} onChange={(event) => updateDocument(index, { type: event.target.value as RetainedDocument["type"] })} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="PIECE">Pièce</option><option value="COURRIER">Courrier</option><option value="AUTRE">Autre</option></select><Input required placeholder="Référence" value={row.reference} onChange={(event) => updateDocument(index, { reference: event.target.value })} /></div>
            <Textarea required placeholder="Description" value={row.description} onChange={(event) => updateDocument(index, { description: event.target.value })} />
            <div className="grid grid-cols-2 gap-3"><div><Label>Quantité</Label><Input required type="number" min="1" value={row.quantite} onChange={(event) => updateDocument(index, { quantite: Number(event.target.value) })} /></div><div><Label>Détenu par</Label><Input required value={row.detenuPar} onChange={(event) => updateDocument(index, { detenuPar: event.target.value })} /></div></div>
            <Input placeholder="Destination / personne à remettre" value={row.destination} onChange={(event) => updateDocument(index, { destination: event.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={row.restitue} onChange={(event) => updateDocument(index, { restitue: event.target.checked })} /> Déjà restitué</label>
          </div>)}
        </section>

        <div><Label>Matériel et clés remis (précisions)</Label><Textarea value={equipment} onChange={(event) => setEquipment(event.target.value)} placeholder="Informations complémentaires sur le matériel…" /></div>
        <div><Label>Événements en cours</Label><Textarea value={ongoingEvents} onChange={(event) => setOngoingEvents(event.target.value)} placeholder="Livraison attendue, incident en cours…" /></div>
        <div><Label>Consignes transmises</Label><Textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Consignes de vigilance à transmettre à l'équipe entrante…" /></div>

        <SignaturePad label="Validation du chef sortant" signed={outgoingSigned} onSignedChange={setOutgoingSigned} />
        <SignaturePad label="Validation du chef entrant" signed={incomingSigned} onSignedChange={setIncomingSigned} />
        <p className="text-xs text-muted-foreground">Les deux validations sont enregistrées avec leur date et heure lors de la confirmation.</p>
        <Button type="submit" className="w-full" disabled={!isFormValid}>Confirmer et enregistrer la passation</Button>
      </form>
    </Panel>
  );
}
