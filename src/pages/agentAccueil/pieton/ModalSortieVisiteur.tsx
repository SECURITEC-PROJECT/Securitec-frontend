import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

interface ModalSortieVisiteurProps {
  visitor: any;
  onClose: () => void;
  onConfirmExit: (visitorId: string | number, visitorName: string, details: { equipmentOut: boolean; extraEquipment: string }) => void;
  formatTime: (dateStr: any) => string;
}

export default function ModalSortieVisiteur({
  visitor,
  onClose,
  onConfirmExit,
  formatTime,
}: ModalSortieVisiteurProps) {
  const [equipmentChecked, setEquipmentChecked] = useState(false);
  const [hasExtraEquipment, setHasExtraEquipment] = useState(false);
  const [extraEquipmentDetails, setExtraEquipmentDetails] = useState("");

  useEffect(() => {
    setEquipmentChecked(false);
    setHasExtraEquipment(false);
    setExtraEquipmentDetails("");
  }, [visitor?.id]);

  if (!visitor) return null;

  return (
    <Dialog open={visitor !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sortie et contrôle de sécurité · {visitor.full_name}</DialogTitle>
          <DialogDescription>
            Résumé du visiteur et vérification du matériel avant la validation de sortie.
          </DialogDescription>
        </DialogHeader>

        {/* Résumé du visiteur */}
        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Société :</span>
            <span className="font-medium text-foreground">{visitor.company || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Badge :</span>
            <span className="font-medium text-foreground">#{visitor.badge || "Aucun"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Entrée à :</span>
            <span className="font-mono font-medium text-foreground">{formatTime(visitor.entered_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Motif / Hôte :</span>
            <span className="font-medium text-foreground">{[visitor.reason, visitor.host && `(Hôte: ${visitor.host})`].filter(Boolean).join(" ")}</span>
          </div>
        </div>

        {/* Contrôles matériels */}
        <div className="space-y-4 py-2">
          {visitor.equipment && visitor.equipment.trim() !== "" ? (
            <div className="rounded-md border p-3 bg-muted/40 space-y-2">
              <p className="text-xs font-semibold text-foreground">Matériel(s) déclaré(s) à l'entrée :</p>
              <p className="text-xs font-mono bg-background p-2 rounded border">{visitor.equipment}</p>
              
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox 
                  id="check-equipment" 
                  checked={equipmentChecked} 
                  onCheckedChange={(v) => setEquipmentChecked(v === true)} 
                />
                <Label htmlFor="check-equipment" className="text-xs font-medium cursor-pointer">
                  Le visiteur sort bien avec le matériel déclaré
                </Label>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Aucun matériel déclaré à l'entrée.</p>
          )}

          {/* Autre matériel apporté ou récupéré */}
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="check-extra" 
                checked={hasExtraEquipment} 
                onCheckedChange={(v) => {
                  setHasExtraEquipment(v === true);
                  if (!v) setExtraEquipmentDetails("");
                }} 
              />
              <Label htmlFor="check-extra" className="text-xs font-medium cursor-pointer">
                Le visiteur apporte / emporte un autre matériel non déclaré initialement
              </Label>
            </div>

            {hasExtraEquipment && (
              <div>
                <Label htmlFor="extra-desc" className="text-[11px] text-muted-foreground mb-1 block">
                  Préciser le ou les matériels :
                </Label>
                <Input 
                  id="extra-desc"
                  placeholder="ex. Échantillons, colis, équipement additionnel..." 
                  value={extraEquipmentDetails} 
                  onChange={(e) => setExtraEquipmentDetails(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button 
            disabled={(Boolean(visitor.equipment?.trim()) && !equipmentChecked) || (hasExtraEquipment && !extraEquipmentDetails.trim())}
            onClick={() => onConfirmExit(visitor.id, visitor.full_name, { 
              equipmentOut: equipmentChecked, 
              extraEquipment: extraEquipmentDetails 
            })}
          >
            Valider la sortie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
