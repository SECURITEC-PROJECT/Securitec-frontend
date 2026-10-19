import { Panel } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Tablet } from "lucide-react";

export default function AuditLogTab() {
  const auditEntry = {
    timestamp: "08/10/2026 à 06:00:02",
    user: "Karim Benali",
    role: "Agent Principal",
    action: "Ouverture de la vacation de jour et validation de la prise de poste",
    category: "Service",
    device: "Tablette Poste Principal (TAB-01)",
    ipAddress: "192.168.1.10"
  };

  return (
    <Panel title="Journal d’audit · Exemple d'événement">
      <div className="rounded-md border p-4 text-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{auditEntry.category}</Badge>
            <span className="font-semibold text-foreground">{auditEntry.action}</span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{auditEntry.timestamp}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div>
            <p className="text-muted-foreground">Effectué par :</p>
            <p className="font-medium text-foreground">{auditEntry.user} <span className="text-muted-foreground">({auditEntry.role})</span></p>
          </div>

          <div>
            <p className="text-muted-foreground">Appareil utilisé :</p>
            <p className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
              <Tablet className="h-3.5 w-3.5 text-muted-foreground" />
              {auditEntry.device}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Adresse IP :</p>
            <p className="font-mono font-medium text-foreground">{auditEntry.ipAddress}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
