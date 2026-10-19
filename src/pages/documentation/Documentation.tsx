import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";
import ListDocumentation, { type DocumentItem } from "./ListDocumentation";
import ModalDocumentation from "./ModalDocumentation";

const docs: DocumentItem[] = [
  { 
    id: 'rules', 
    title: 'Règlement intérieur du site', 
    version: 'Version 1.0', 
    content: 'Accès limité aux zones autorisées. Port du badge obligatoire. Les visiteurs sont accompagnés dans les zones restreintes. Les issues de secours doivent rester dégagées. Tout incident est consigné dans la main courante.' 
  }, 
  { 
    id: 'instructions', 
    title: 'Consignes permanentes du poste', 
    version: 'Version 1.0', 
    content: 'Vérifier les équipements à la prise de poste. Contrôler chaque passage. Effectuer les rondes prévues. Transmettre les événements en cours à la relève et rédiger le compte rendu de vacation.' 
  }, 
  { 
    id: 'emergency', 
    title: 'Procédure d’alerte et d’évacuation', 
    version: 'Version 1.0', 
    content: 'Signaler le danger au superviseur. Protéger les personnes sans se mettre en danger. Suivre les consignes d’évacuation du site. Consigner les faits et les mesures prises.' 
  }
];

export default function Documentation() {
  const [read, setRead] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const handleConfirmRead = (id: string) => {
    if (!read.includes(id)) {
      setRead([...read, id]);
    }
  };

  const selectedDoc = docs.find((d) => d.id === open);

  return (
    <div>
      <PageHeader 
        title="Documents du site" 
        subtitle="Règlement intérieur et consignes permanentes · Textes de démonstration" 
      />

      <ListDocumentation 
        docs={docs} 
        read={read} 
        onConsult={(id) => setOpen(id)} 
      />

      <ModalDocumentation 
        doc={selectedDoc} 
        open={open !== null} 
        onClose={() => setOpen(null)} 
        onConfirmRead={handleConfirmRead} 
      />
    </div>
  );
}