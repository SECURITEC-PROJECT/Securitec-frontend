import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnomalies } from "@/hooks/useAnomalies";
import type { VisitorRecord } from "@/types/visitor";
import { Pencil, Printer, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatTime } from "./formatTime";

const formatDate = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] || character);

export default function ListPieton({
  visitors,
  onEdit,
  onDelete,
}: {
  visitors: VisitorRecord[];
  onEdit: (visitor: VisitorRecord) => void;
  onDelete: (visitor: VisitorRecord) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const anomalies = useAnomalies();
  const enAnomalie = new Set(anomalies.filter((a) => a.type === "visiteur").map((a) => String(a.rowId)));
  const filtered = useMemo(() => {
    const query = q.trim().toLocaleLowerCase();
    if (!query) return visitors;
    return visitors.filter((visitor) => [
      visitor.full_name,
      visitor.company,
      visitor.reason,
      visitor.badge,
      visitor.entered_at,
      visitor.exited_at,
    ].some((value) => String(value ?? "").toLocaleLowerCase().includes(query)));
  }, [q, visitors]);

  const printVisitors = (items: VisitorRecord[], title: string) => {
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) {
      toast.error("Autorisez les fenêtres contextuelles pour imprimer le registre.");
      return;
    }
    const rows = items.map((visitor) => {
      const values = [
        formatDate(visitor.entered_at),
        visitor.full_name || "—",
        visitor.company || "—",
        visitor.reason || "—",
        visitor.badge || "—",
        formatTime(visitor.entered_at),
        formatTime(visitor.exited_at),
      ];
      return `<tr>${values.map((value) => `<td>${escapeHtml(String(value))}</td>`).join("")}</tr>`;
    }).join("");
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            * { box-sizing: border-box; }
            body { color: #172033; font: 12px Arial, sans-serif; }
            h1 { margin: 0 0 18px; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 7px; border: 1px solid #d6dbe4; text-align: left; vertical-align: top; }
            th { background: #edf1f5; font-size: 10px; text-transform: uppercase; }
            td { white-space: pre-wrap; overflow-wrap: anywhere; }
            tr { break-inside: avoid; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <table>
            <thead><tr><th>Date</th><th>Nom et prénom</th><th>Établissement</th><th>Motif</th><th>N° badge</th><th>Heure d’entrée</th><th>Heure de sortie</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  return (
    <Panel title="Registre complet">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Rechercher dans le registre visiteurs"
            placeholder="Rechercher nom, établissement, motif, badge…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" disabled={!visitors.length} onClick={() => printVisitors(visitors, "Registre des visiteurs")}>
          <Printer className="h-4 w-4" />
          Imprimer tout le registre
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              {["Date", "Nom et prénom", "Établissement", "Motif", "N° badge", "Heure d’entrée", "Heure de sortie", "Actions"].map((label) => (
                <th key={label} className="whitespace-nowrap border-b py-2 pr-3">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((visitor) => (
              <tr key={visitor.id} className={enAnomalie.has(String(visitor.id)) ? "bg-red-50 font-medium text-red-700" : ""}>
                <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs">{formatDate(visitor.entered_at)}</td>
                <td className="py-2 pr-3 font-medium">{visitor.full_name || "—"}</td>
                <td className="py-2 pr-3">{visitor.company || "—"}</td>
                <td className="max-w-sm whitespace-pre-wrap py-2 pr-3">{visitor.reason || "—"}</td>
                <td className="py-2 pr-3 font-mono">{visitor.badge || "—"}</td>
                <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs">{formatTime(visitor.entered_at)}</td>
                <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs">{formatTime(visitor.exited_at)}</td>
                <td className="whitespace-nowrap py-2">
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer le passage" title="Imprimer le passage" onClick={() => printVisitors([visitor], "Passage visiteur")}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Modifier le passage" title="Modifier le passage" onClick={() => onEdit(visitor)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label={visitor.exited_at ? "Supprimer le passage" : "La sortie doit être enregistrée avant la suppression"}
                      title={visitor.exited_at ? "Supprimer le passage" : "Enregistrez la sortie avant de supprimer ce passage"}
                      disabled={!visitor.exited_at}
                      onClick={() => void onDelete(visitor)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                {visitors.length ? "Aucun résultat pour cette recherche." : "Aucun passage enregistré."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
