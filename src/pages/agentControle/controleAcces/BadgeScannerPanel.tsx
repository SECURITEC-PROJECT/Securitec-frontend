import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demo } from "@/lib/demo-store";
import { ScanLine } from "lucide-react";
import { useState } from "react";

interface BadgeScannerPanelProps {
  rows: any[];
}

export default function BadgeScannerPanel({ rows }: BadgeScannerPanelProps) {
  const [uid, setUid] = useState("V-014");
  const [result, setResult] = useState<{ title: string; text: string; allowed: boolean } | null>(null);

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    const badge = rows.find((b) => b.uid === uid);
    const allowed = Boolean(badge?.active);
    
    setResult({ 
      allowed, 
      title: allowed ? 'Accès autorisé' : 'Accès refusé', 
      text: badge ? `${badge.holder} · ${badge.zone}` : 'Badge inconnu' 
    });

    demo.add("logbook_entries", { 
      category: "Intervention", 
      severity: allowed ? "normal" : "urgent", 
      description: `Simulation badge ${uid} : ${allowed ? "autorisé" : "refusé"}` 
    });
  };

  return (
    <Panel title="Lecture d’un badge · Simulation">
      <form className="space-y-4" onSubmit={handleSimulate}>
        <Label htmlFor="badge-uid">UID du badge</Label>
        <Input id="badge-uid" value={uid} onChange={(e) => setUid(e.target.value)} required />
        <Button className="w-full"><ScanLine /> Simuler la lecture</Button>
      </form>

      {result && (
        <div className={`mt-5 border-l-4 p-4 ${result.allowed ? 'border-success bg-success/10' : 'border-destructive bg-destructive/10'}`} role="status">
          <p className="font-semibold">{result.title}</p>
          <p className="mt-1 text-xs">{result.text}</p>
        </div>
      )}
    </Panel>
  );
}