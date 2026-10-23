import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_URL, authHeaders } from "@/lib/api";
import { useEffect, useState, type FormEvent } from "react";
import SignaturePad from "./SignaturePad";

export interface PassationFormData {
  incoming_matricule: string;
  incoming_prestataire: string;
  incoming_nom: string;
  incoming_prenom: string;
  equipment: string;
  ongoing_events: string;
  instructions: string;
}

interface FormPassationProps {
  agentSortantNom?: string;
  agentSortantPrenom?: string;
  onSubmit: (f: PassationFormData) => void;
}

export default function FormPassation({
  agentSortantNom = "",
  agentSortantPrenom = "",
  onSubmit,
}: FormPassationProps) {
  const [matricule, setMatricule] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "valid" | "invalid">("idle");
  const [nomMontant, setNomMontant] = useState("");
  const [prenomMontant, setPrenomMontant] = useState("");
  const [prestataireMontant, setPrestataireMontant] = useState("");
  const [equipment, setEquipment] = useState("");
  const [ongoingEvents, setOngoingEvents] = useState("");
  const [instructions, setInstructions] = useState("");
  const [outgoingSigned, setOutgoingSigned] = useState(false);
  const [incomingSigned, setIncomingSigned] = useState(false);

  // Vérification automatique du matricule de l'agent montant (nom et prénom se remplissent seuls)
  useEffect(() => {
    const trimmed = matricule.trim();

    if (!trimmed) {
      setStatus("idle");
      setNomMontant("");
      setPrenomMontant("");
      setPrestataireMontant("");
      return;
    }

    setStatus("verifying");
    const controller = new AbortController();
    let active = true;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/employes/${encodeURIComponent(trimmed)}`, {
          headers: authHeaders(),
          signal: controller.signal,
        });
        if (!active) return;
        if (res.ok) {
          const employee = await res.json();
          setNomMontant(employee.nom ?? "");
          setPrenomMontant(employee.prenom ?? "");
          setPrestataireMontant(employee.prestataire ?? "");
          setStatus("valid");
        } else {
          setNomMontant("");
          setPrenomMontant("");
          setPrestataireMontant("");
          setStatus("invalid");
        }
      } catch (error) {
        if (active) setStatus("invalid");
      }
    }, 400);

    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [matricule]);

  // L'agent sortant doit être connu et l'agent montant identifié par son matricule
  const isFormValid =
    agentSortantNom.trim() !== "" &&
    agentSortantPrenom.trim() !== "" &&
    status === "valid";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    onSubmit({
      incoming_matricule: matricule.trim(),
      incoming_prestataire: prestataireMontant,
      incoming_nom: nomMontant.trim(),
      incoming_prenom: prenomMontant.trim(),
      equipment,
      ongoing_events: ongoingEvents,
      instructions,
    });
  };

  const getInputStyles = () => {
    if (status === "valid") return "border-emerald-500 focus-visible:ring-emerald-500 bg-emerald-50/20";
    if (status === "invalid") return "border-red-500 focus-visible:ring-red-500 bg-red-50/20";
    return "";
  };

  return (
    <Panel title="Nouvelle passation">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Agent sortant (lecture seule) */}
        <div className="grid grid-cols-2 gap-4 rounded-md border p-3 bg-muted/30">
          <div>
            <Label className="text-xs text-muted-foreground">Agent sortant (Nom)</Label>
            <Input disabled value={agentSortantNom} className="mt-1 bg-background" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Agent sortant (Prénom)</Label>
            <Input disabled value={agentSortantPrenom} className="mt-1 bg-background" />
          </div>
        </div>

        {/* Agent montant : identifié par son matricule */}
        <div>
          <Label htmlFor="matricule-montant">Agent montant - Matricule *</Label>
          <Input
            id="matricule-montant"
            required
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            placeholder="ex. MAT-0001"
            className={`mt-1 transition-colors ${getInputStyles()}`}
          />
          {status === "verifying" && (
            <p className="text-xs text-muted-foreground mt-1">Vérification en cours...</p>
          )}
          {status === "invalid" && (
            <p className="text-xs text-red-500 font-medium mt-1">
              ✕ Ce matricule n'existe pas dans la base de données.
            </p>
          )}
          {status === "valid" && (
            <p className="text-xs text-emerald-600 font-medium mt-1">
              ✓ Agent identifié : {nomMontant} {prenomMontant}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Agent montant - Nom</Label>
            <Input readOnly value={nomMontant} placeholder="Nom" className="mt-1 bg-muted" />
          </div>
          <div>
            <Label>Agent montant - Prénom</Label>
            <Input readOnly value={prenomMontant} placeholder="Prénom" className="mt-1 bg-muted" />
          </div>
        </div>

        <div>
          <Label>Matériel et clés remis</Label>
          <Textarea
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="Radio n°2, trousseau A, badge maître…"
          />
        </div>

        <div>
          <Label>Événements en cours</Label>
          <Textarea
            value={ongoingEvents}
            onChange={(e) => setOngoingEvents(e.target.value)}
            placeholder="Livraison attendue à 14h, porte B défectueuse…"
          />
        </div>

        <div>
          <Label>Consignes particulières</Label>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Consignes de vigilance..."
          />
        </div>

        <SignaturePad label="Signature de l’agent sortant" signed={outgoingSigned} onSignedChange={setOutgoingSigned} />
        <SignaturePad label="Signature de l’agent entrant" signed={incomingSigned} onSignedChange={setIncomingSigned} />

        {/* Le bouton est grisé tant que l'agent sortant ou l'agent montant n'est pas identifié */}
        <Button type="submit" className="w-full" disabled={!isFormValid}>
          Confirmer et enregistrer la passation
        </Button>
      </form>
    </Panel>
  );
}