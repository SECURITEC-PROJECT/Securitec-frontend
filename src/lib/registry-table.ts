import { toast } from "sonner";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] || character);
}

export function printRegistryTable(
  title: string,
  siteName: string,
  headers: readonly string[],
  rows: readonly (readonly string[])[],
) {
  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) {
    toast.error("Autorisez les fenêtres contextuelles pour imprimer.");
    return;
  }
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows.map((row) =>
    `<tr>${headers.map((_, index) => `<td>${escapeHtml(row[index] || "")}</td>`).join("")}</tr>`,
  ).join("");
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { color: #172033; font: 10pt Arial, sans-serif; }
      h1 { margin: 0 0 6px; font-size: 18pt; }
      p { margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #777; padding: 6px; text-align: left; vertical-align: top; white-space: pre-wrap; overflow-wrap: anywhere; }
      th { background: #eee; }
      tr { break-inside: avoid; }
    </style></head><body><h1>${escapeHtml(title)}</h1>
    <p>Site : ${escapeHtml(siteName || "—")} · Imprimé le ${escapeHtml(new Date().toLocaleString("fr-FR"))}</p>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
    </body></html>`);
  printWindow.document.close();
}

export function downloadWordTable(
  filename: string,
  title: string,
  siteName: string,
  headers: readonly string[],
  rows: readonly (readonly string[])[],
) {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows.map((row) =>
    `<tr>${headers.map((_, index) => `<td>${escapeHtml(row[index] || "")}</td>`).join("")}</tr>`,
  ).join("");
  const html = `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="fr">
    <head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
      <style>@page Section1 { size: 841.9pt 595.3pt; margin: 28.35pt; mso-page-orientation: landscape; }
        div.Section1 { page: Section1; } body { font: 10pt Arial, sans-serif; } table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #777; padding: 5px; text-align: left; vertical-align: top; white-space: pre-wrap; overflow-wrap: anywhere; } th { background: #eee; }</style>
    </head><body><div class="Section1"><h1>${escapeHtml(title)}</h1><p>Site : ${escapeHtml(siteName || "—")}</p>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "application/msword" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
