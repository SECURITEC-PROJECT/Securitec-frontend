import { Label } from "@/components/ui/label";
import { useState } from "react";

interface SignaturePadProps {
  label: string;
  onSignedChange?: (signed: boolean) => void;
}

export default function SignaturePad({ label }: SignaturePadProps) {
  const [signed, setSigned] = useState(false);

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div 
        onClick={() => setSigned(!signed)} 
        className={`h-24 w-full rounded-md border border-input bg-background flex items-center justify-center text-xs cursor-pointer border-dashed border-2 transition-colors ${
          signed ? 'border-success text-success bg-success/5 font-semibold' : 'text-muted-foreground hover:bg-muted/50'
        }`}
      >
        {signed ? "✓ Signature numérique enregistrée" : "Zone de signature numérique (Cliquer pour signer)"}
      </div>
    </div>
  );
}