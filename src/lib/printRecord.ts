import { toast } from "sonner";

export function printRecord(title: string, siteName: string, rows: ReadonlyArray<readonly [string, string]>) {
  const printWindow = window.open("", "_blank", "width=420,height=520");
  if (!printWindow) {
    toast.error("Autorisez les fenêtres contextuelles pour imprimer.");
    return;
  }
  const escapedTitle = escapeHtml(title);
  const details = rows.map(([label, value]) =>
    `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "—")}</strong></div>`,
  ).join("");
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>${escapedTitle}</title>
        <style>
          @page { size: 80mm 80mm; margin: 4mm; }
          * { box-sizing: border-box; }
          body { width: 72mm; margin: 0 auto; color: #172033; font: 10px Arial, sans-serif; }
          h1 { margin: 2mm 0 1mm; text-align: center; font-size: 15px; }
          .subtitle { margin: 0 0 2mm; text-align: center; font-size: 9px; }
          .site { margin: 0 0 2mm; text-align: center; font-size: 10px; font-weight: 700; }
          .row { display: flex; justify-content: space-between; gap: 2mm; border-bottom: 1px dashed #999; padding: 1.4mm 0; break-inside: avoid; }
          .row span { flex: 0 1 43%; }
          .row strong { flex: 1 1 57%; text-align: right; overflow-wrap: anywhere; white-space: pre-wrap; }
          .footer { margin: 2mm 0 0; text-align: center; font-size: 8px; }
        </style>
      </head>
      <body>
        <h1>${escapedTitle}</h1>
        <p class="subtitle">Bon d’enregistrement · format 80 × 80 mm</p>
        <p class="site">${escapeHtml(siteName || "—")}</p>
        ${details}
        <p class="footer">Securitec · Registre</p>
        <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
      </body>
    </html>`);
  printWindow.document.close();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] || character);
}
