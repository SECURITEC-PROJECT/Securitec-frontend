import { PageHeader } from "@/components/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { demo } from "@/lib/demo-store";
import { useState } from "react";
import { toast } from "sonner";
import GrilleCameras from "./GrilleCameras";
import ModalAgrandissementCamera from "./ModalAgrandissementCamera";

export default function Cameras() {
  const [count, setCount] = useState('4'); 
  const [selected, setSelected] = useState<string | null>(null);
  const names = ['Portail principal', 'Cour de livraison', 'Parking', 'Entrepôt', 'Hall accueil', 'Zone technique', 'Périmètre est', 'Périmètre ouest'];
  
  const capture = (name: string) => { 
    demo.add('logbook_entries', { category: 'Information', description: `Capture illustrative rattachée à l’événement · ${name}` }); 
    toast.success('Capture illustrative ajoutée à la main courante'); 
  };

  return (
    <div>
      <PageHeader 
        title="Mur caméras" 
        subtitle="Images illustratives · Aucun flux vidéo connecté" 
        action={
          <Select value={count} onValueChange={setCount}>
            <SelectTrigger aria-label="Nombre de vues" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['1', '4', '8', '16'].map((c) => <SelectItem value={c} key={c}>{c} vue{c !== '1' ? 's' : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        } 
      />
      
      <GrilleCameras 
        count={count} 
        names={names} 
        onCapture={capture} 
        onSelect={setSelected} 
      />

      <ModalAgrandissementCamera 
        selected={selected} 
        onClose={() => setSelected(null)} 
        onCapture={capture} 
      />
    </div>
  );
}