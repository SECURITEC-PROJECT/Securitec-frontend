import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState, type FormEvent } from "react";
import SignaturePad from "./SignaturePad";

interface FormPassationProps {
  agentSortantNom?: string;
  agentSortantPrenom?: string;
  initialNomMontant?: string;
  initialPrenomMontant?: string;
  onSubmit: (f: {
    incoming_nom: string;
    incoming_prenom: string;
    equipment: string;
    ongoing_events: string;
    instructions: string;
  }) => void;
}

export default function FormPassation({
  agentSortantNom = "",
  agentSortantPrenom = "",
  initialNomMontant = "",
  initialPrenomMontant = "",
  onSubmit,
}: FormPassationProps) {
  const [nomMontant, setNomMontant] = useState(initialNomMontant);
  const [prenomMontant, setPrenomMontant] = useState(initialPrenomMontant);
  const [equipment, setEquipment] = useState("");
  const [ongoingEvents, setOngoingEvents] = useState("");
  const [instructions, setInstructions] = useState("");
  const [outgoingSigned, setOutgoingSigned] = useState(false);
  const [incomingSigned, setIncomingSigned] = useState(false);

  useEffect(() => {
    if (initialNomMontant) setNomMontant(initialNomMontant);
    if (initialPrenomMontant) setPrenomMontant(initialPrenomMontant);
  }, [initialNomMontant, initialPrenomMontant]);

  // Vérifie si l'agent sortant ET l'agent montant ont bien un nom et un prénom renseignés
  const isFormValid =
    agentSortantNom.trim() !== "" &&
    agentSortantPrenom.trim() !== "" &&
    nomMontant.trim() !== "" &&
    prenomMontant.trim() !== "";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    onSubmit({
      incoming_nom: nomMontant.trim(),
      incoming_prenom: prenomMontant.trim(),
      equipment,
      ongoing_events: ongoingEvents,
      instructions,
    });

    setNomMontant("");
    setPrenomMontant("");
    setEquipment("");
    setOngoingEvents("");
    setInstructions("");
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

        {/* Agent montant (Champs séparés) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Agent montant - Nom *</Label>
            <Input
              required
              value={nomMontant}
              onChange={(e) => setNomMontant(e.target.value)}
              placeholder="ex. Rakoto"
            />
          </div>
          <div>
            <Label>Agent montant - Prénom *</Label>
            <Input
              required
              value={prenomMontant}
              onChange={(e) => setPrenomMontant(e.target.value)}
              placeholder="ex. Mickaël"
            />
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

        {/* Le bouton est grisé et non cliquable si l'agent sortant ou montant est vide */}
        <Button type="submit" className="w-full" disabled={!isFormValid}>
          Confirmer et enregistrer la passation
        </Button>
      </form>
    </Panel>
  );
}
