import { Label } from "@/components/ui/label";

interface SignaturePadProps {
  label: string;
  signed: boolean;
  onSignedChange: (signed: boolean) => void;
}

export default function SignaturePad({ label, signed, onSignedChange }: SignaturePadProps) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div 
        role="checkbox"
        aria-checked={signed}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSignedChange(!signed); } }}
        onClick={() => onSignedChange(!signed)} 
        className={`h-24 w-full rounded-md border border-input bg-background flex items-center justify-center text-xs cursor-pointer border-dashed border-2 transition-colors ${
          signed ? 'border-success text-success bg-success/5 font-semibold' : 'text-muted-foreground hover:bg-muted/50'
        }`}
      >
        {signed ? "✓ Confirmation enregistrée" : "Cliquer pour confirmer la remise / réception"}
      </div>
    </div>
  );
}
