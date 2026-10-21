import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const API_URL = "http://localhost:5000/api";

export default function BadgeScannerPanel() {
  const [uid, setUid] = useState("V-014");
  const [result, setResult] = useState<{ title: string; text: string; allowed: boolean } | null>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/badges/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur de lecture");

      setResult({
        allowed: data.allowed,
        title: data.title,
        text: data.text,
      });
      toast.success("Scan effectué avec succès dans la base de données.");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du scan du badge.");
    }
  };

  return (
    <Panel title="Lecture d’un badge · Réel (Base de données)">
      <form className="space-y-4" onSubmit={handleSimulate}>
        <Label htmlFor="badge-uid">UID du badge</Label>
        <Input id="badge-uid" value={uid} onChange={(e) => setUid(e.target.value)} required />
        <Button className="w-full"><ScanLine /> Vérifier le badge (BDD)</Button>
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