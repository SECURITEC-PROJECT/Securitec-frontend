import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { serviceApi } from "@/lib/service-api";
import { VIGILANCE_SCHEMA } from "./vigilanceSchema";

interface FormVigilanceProps {
  siteId?: string;
  onRefresh?: () => void;
}

type VigilanceFormItem = {
  typePoint: string;
  elementVerifie: string;
  statut: string;
  observations: string;
};

export default function FormVigilance({ siteId, onRefresh }: FormVigilanceProps) {
  const [items, setItems] = useState<VigilanceFormItem[]>(() =>
    VIGILANCE_SCHEMA.flatMap((group) => group.elements.map((elementVerifie) => ({
      typePoint: group.type,
      elementVerifie,
      statut: "Conforme",
      observations: "",
    }))),
  );

  const [agentNom, setAgentNom] = useState("");
  const [saving, setSaving] = useState(false);

  const handleStatusChange = (index: number, val: string) => {
    const updated = [...items];
    updated[index].statut = val;
    setItems(updated);
  };

  const handleObsChange = (index: number, val: string) => {
    const updated = [...items];
    updated[index].observations = val;
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const payload = items.map((it) => ({
      ...it,
      agentNom,
      heure: currentTime,
      siteId,
    }));

    setSaving(true);
    try {
      await serviceApi.createVigilance(payload);

      toast.success("Points de vigilance consignés avec succès dans le CRJ !");
      if (onRefresh) void onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer les points de vigilance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Points de vigilance">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-muted/50 p-3 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <span className="font-semibold text-primary">
              Registre de contrôle périodique
            </span>
          </div>
          <Input
            required
            placeholder="Agent contrôleur (Nom/Matricule)"
            value={agentNom}
            onChange={(e) => setAgentNom(e.target.value)}
            className="h-8 w-60 bg-background text-xs"
          />
        </div>

        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted text-muted-foreground font-semibold border-b">
              <tr>
                <th className="p-2 border-r w-1/4">Domaine</th>
                <th className="p-2 border-r w-1/3">Élément à vérifier</th>
                <th className="p-2 border-r w-24">Statut</th>
                <th className="p-2">Observations / Remarques</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((row, idx) => (
                <tr key={`${row.typePoint}-${row.elementVerifie}`} className="hover:bg-muted/20">
                  <td className="p-2 border-r font-medium text-muted-foreground bg-muted/10">
                    {row.typePoint}
                  </td>
                  <td className="p-2 border-r font-medium">{row.elementVerifie}</td>
                  <td className="p-2 border-r">
                    <select
                      className={`w-full h-8 rounded border px-1 text-xs font-semibold ${
                        row.statut === "Conforme"
                          ? "text-success border-success/40 bg-success/10"
                          : "text-destructive border-destructive/40 bg-destructive/10"
                      }`}
                      value={row.statut}
                      onChange={(e) => handleStatusChange(idx, e.target.value)}
                    >
                      <option value="Conforme">Conforme</option>
                      <option value="Non Conforme">Non Conforme</option>
                      <option value="RAS">RAS</option>
                    </select>
                  </td>
                  <td className="p-1">
                    <Input
                      value={row.observations}
                      onChange={(e) => handleObsChange(idx, e.target.value)}
                      placeholder="Observation particulière..."
                      className="h-8 text-xs border-none focus-visible:ring-0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button type="submit" disabled={!siteId || saving || !agentNom.trim()} className="w-full h-10 font-semibold">
          <CheckCircle2 className="mr-2 h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer le contrôle des Points de Vigilance"}
        </Button>
      </form>
    </Panel>
  );
}
