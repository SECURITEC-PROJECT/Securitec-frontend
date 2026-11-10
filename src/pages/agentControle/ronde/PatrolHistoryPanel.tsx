import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, CircleCheck, Eye } from "lucide-react";
import { useState } from "react";

type Cp = { name: string; at: string | null };

interface PatrolHistoryPanelProps {
  data: {
    id: string;
    route_name: string;
    started_at: string;
    ended_at: string | null;
    checkpoints: Cp[];
    anomalies: string | null;
    pendingSync?: boolean;
    pendingFinish?: boolean;
    pendingSyncStatus?: "pending" | "conflict" | "rejected";
    pendingSyncError?: string;
  }[];
  fmt: (dateStr: string | null) => string;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function PatrolHistoryPanel({ data, fmt, total, page, pageSize, pageCount, onPageChange, onPageSizeChange }: PatrolHistoryPanelProps) {
  const [selectedPatrol, setSelectedPatrol] = useState<PatrolHistoryPanelProps["data"][number] | null>(null);
  const firstRow = total ? (page - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(page * pageSize, total);
  const pageNumbers = Array.from(
    { length: Math.min(pageCount, page + 1) - Math.max(1, page - 1) + 1 },
    (_, index) => Math.max(1, page - 1) + index,
  );

  return (
    <>
      <div className="patrol-results-summary patrol-screen">
        <p><CircleCheck aria-hidden="true" />{total} ronde(s) trouvée(s)</p>
        <label>
          Afficher
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            <option value={10}>10 lignes</option>
            <option value={25}>25 lignes</option>
            <option value={50}>50 lignes</option>
            <option value={100}>100 lignes</option>
          </select>
        </label>
      </div>
      <div className="overflow-auto rounded-lg patrol-screen">
        <table className="patrol-history-table w-full border-collapse text-left text-sm">
          <thead>
            <tr>{["N°", "Date", "Parcours", "Début", "Fin", "Points contrôlés", "Statut", "Observations", "Action"].map((heading) => <th key={heading}>{heading}</th>)}</tr>
          </thead>
          <tbody>
            {data.map((patrol, index) => {
              const checkpoints = patrol.checkpoints || [];
              const checkedCount = checkpoints.filter((point) => point.at).length;
              const status = patrol.pendingSync ? "pending" : patrol.ended_at ? "finished" : "active";
              const statusLabel = patrol.pendingSync
                ? patrol.pendingSyncStatus === "conflict" ? "Conflit à résoudre" : patrol.pendingSyncStatus === "rejected" ? "À vérifier" : patrol.pendingFinish ? "Clôture en attente" : "En attente réseau"
                : patrol.ended_at ? "Terminée" : "En cours";
              return (
                <tr key={patrol.id} className={`patrol-history-row patrol-history-row--${status}`}>
                  <td>{firstRow + index}</td>
                  <td className="whitespace-nowrap">{fmt(patrol.started_at).split(" ")[0]}</td>
                  <td className="font-medium">{patrol.route_name}</td>
                  <td className="whitespace-nowrap">{fmt(patrol.started_at).split(" ").at(-1)}</td>
                  <td className="whitespace-nowrap">{patrol.ended_at ? fmt(patrol.ended_at).split(" ").at(-1) : "—"}</td>
                  <td>{checkedCount}/{checkpoints.length}</td>
                  <td>
                    <span className={`patrol-status patrol-status--${status}`}>{statusLabel}</span>
                    {patrol.pendingSyncError && <span className="patrol-status-detail">{patrol.pendingSyncError}</span>}
                  </td>
                  <td className="patrol-observation-cell">{patrol.anomalies || "—"}</td>
                  <td>
                    <Button type="button" size="sm" variant="outline" className="patrol-details-button" onClick={() => setSelectedPatrol(patrol)}>
                      <Eye aria-hidden="true" />Détails
                    </Button>
                  </td>
                </tr>
              );
            })}
            {!data.length && <tr><td colSpan={9} className="patrol-empty-row">Aucune ronde ne correspond aux filtres sélectionnés.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="patrol-pagination patrol-screen">
        <span>{total ? `${firstRow}–${lastRow} sur ${total}` : "Aucun résultat"}</span>
        <div>
          <Button type="button" variant="outline" size="icon" aria-label="Page précédente" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          {pageNumbers.map((pageNumber) => (
            <Button key={pageNumber} type="button" variant={pageNumber === page ? "default" : "outline"} className="patrol-page-number" aria-current={pageNumber === page ? "page" : undefined} onClick={() => onPageChange(pageNumber)}>
              {pageNumber}
            </Button>
          ))}
          <Button type="button" variant="outline" size="icon" aria-label="Page suivante" disabled={page >= pageCount} onClick={() => onPageChange(Math.min(pageCount, page + 1))}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
      <Dialog open={Boolean(selectedPatrol)} onOpenChange={(open) => { if (!open) setSelectedPatrol(null); }}>
        {selectedPatrol && (
          <DialogContent className="patrol-details-dialog">
            <DialogHeader>
              <DialogTitle>{selectedPatrol.route_name}</DialogTitle>
              <DialogDescription>
                Début : {fmt(selectedPatrol.started_at)} · Fin : {fmt(selectedPatrol.ended_at)}
              </DialogDescription>
            </DialogHeader>
            <div className="patrol-details-content">
              <h3>Points de contrôle</h3>
              <ul>
                {(selectedPatrol.checkpoints || []).map((point, index) => (
                  <li key={`${point.name}-${index}`} className={point.at ? "patrol-details-checkpoint--done" : ""}>
                    <span>{point.name}</span>
                    <span>{point.at ? fmt(point.at) : "Non contrôlé"}</span>
                  </li>
                ))}
              </ul>
              <h3>Observations</h3>
              <p>{selectedPatrol.anomalies || "Aucune observation."}</p>
              {selectedPatrol.pendingSyncError && <p className="patrol-status-detail">{selectedPatrol.pendingSyncError}</p>}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
