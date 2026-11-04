import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { serviceApi } from "@/lib/service-api";
import { ScanLine } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

interface ScanResult {
  title: string;
  text: string;
  allowed: boolean;
}

export default function BadgeScannerPanel({ onScanned }: { onScanned: () => void }) {
  const [uid, setUid] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOffline = () => {
      setOnline(false);
      setResult(null);
    };
    const handleOnline = () => setOnline(true);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const handleScan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!online) {
      toast.error("La vérification du badge nécessite une connexion au serveur.");
      return;
    }
    setLoading(true);
    try {
      const data = await serviceApi.scanBadge(uid);
      setResult({ allowed: Boolean(data.allowed), title: data.title, text: data.text });
      if (data.allowed) onScanned();
      else toast.warning(data.title || "Accès refusé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du scan du badge.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="Vérifier un badge NFC">
      <form className="space-y-4" onSubmit={handleScan}>
        <div className="space-y-2">
          <Label htmlFor="badge-uid">UID du badge</Label>
          <Input id="badge-uid" value={uid} onChange={(event) => setUid(event.target.value)} placeholder="Lire ou saisir l’UID" required autoComplete="off" />
        </div>
        <Button className="w-full" disabled={loading || !online}>
          <ScanLine className="mr-2 h-4 w-4" />{loading ? "Vérification…" : "Vérifier l’accès"}
        </Button>
      </form>

      {result && (
        <div className={`mt-5 border-l-4 p-4 ${result.allowed ? "border-success bg-success/10" : "border-destructive bg-destructive/10"}`} role="status">
          <p className="font-semibold">{result.title}</p>
          <p className="mt-1 text-xs">{result.text}</p>
        </div>
      )}
      {!online && (
        <p className="text-xs text-muted-foreground" role="note">
          La vérification d’accès nécessite une connexion au serveur. Aucun accès n’est accordé à partir du cache hors ligne.
        </p>
      )}
    </Panel>
  );
}
