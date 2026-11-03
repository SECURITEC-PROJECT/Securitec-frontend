import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type PondBrutEntry } from "@/lib/service-api";
import { Printer, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { printRecord } from "@/lib/printRecord";

const displayDate = (value: string) => {
  const part = value.slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(part) ? new Date(`${part}T00:00:00.000Z`) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "—";
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
})[character] || character);

export default function PondBrut() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [entries, setEntries] = useState<PondBrutEntry[]>([]);
  const [search, setSearch] = useState("");
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);

  useEffect(() => {
    let active = true;
    setEntries([]);
    if (!site?.id) return () => { active = false; };
    const refreshEntries = () => serviceApi.listPondBrut(site.id)
      .then((rows) => { if (active) setEntries(rows); })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Chargement du registre Pond Bascul impossible."));
    const refreshOnQueueChange = () => { void refreshEntries(); };
    void refreshEntries();
    window.addEventListener("online", refreshOnQueueChange);
    window.addEventListener("securitec-offline-queue-changed", refreshOnQueueChange);
    return () => {
      active = false;
      window.removeEventListener("online", refreshOnQueueChange);
      window.removeEventListener("securitec-offline-queue-changed", refreshOnQueueChange);
    };
  }, [site?.id]);

  const filteredEntries = entries.filter((entry) =>
    [entry.date, entry.vehicule, entry.clientFournisseur, entry.produit, entry.remarque, String(entry.brut), String(entry.tare), String(entry.net)]
      .some((value) => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
  );

  const printEntry = (entry: PondBrutEntry) => printRecord("Pesée Pont Bascule", siteName || selectedSiteName, [
    ["Date", displayDate(entry.date)],
    ["Véhicule", entry.vehicule || "—"],
    ["Client / Fournisseur", entry.clientFournisseur || "—"],
    ["Produit", entry.produit || "—"],
    ["BRUT", `${entry.brut} kg`],
    ["TARE", `${entry.tare} kg`],
    ["NET", `${entry.net} kg`],
    ["Observations", entry.remarque || entry.observation || "—"],
  ]);

  const printRegister = () => {
    if (!filteredEntries.length) return;
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) {
      toast.error("Autorisez les fenêtres contextuelles pour imprimer le registre.");
      return;
    }
    const groups = new Map<string, PondBrutEntry[]>();
    [...filteredEntries]
      .sort((left, right) => right.date.localeCompare(left.date))
      .forEach((entry) => {
        const date = entry.date.slice(0, 10);
        groups.set(date, [...(groups.get(date) || []), entry]);
      });
    const sections = [...groups.entries()].map(([date, rows]) => `
      <section>
        <h2>${escapeHtml(displayDate(date))}</h2>
        <table>
          <thead><tr><th>Véhicule</th><th>Client / Fournisseur</th><th>Produit</th><th>BRUT</th><th>TARE</th><th>NET</th><th>Observations</th></tr></thead>
          <tbody>${rows.map((entry) => `<tr>
            <td>${escapeHtml(entry.vehicule || "—")}</td>
            <td>${escapeHtml(entry.clientFournisseur || "—")}</td>
            <td>${escapeHtml(entry.produit || "—")}</td>
            <td>${escapeHtml(String(entry.brut))}</td>
            <td>${escapeHtml(String(entry.tare))}</td>
            <td>${escapeHtml(String(entry.net))}</td>
            <td>${escapeHtml(entry.remarque || entry.observation || "—")}</td>
          </tr>`).join("")}</tbody>
        </table>
      </section>`).join("");
    const title = "Registre Pont Bascule";
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title>
      <style>
        @page { size: landscape; margin: 12mm; }
        * { box-sizing: border-box; }
        body { color: #172033; font: 10px Arial, sans-serif; }
        h1 { margin: 0 0 4mm; font-size: 18px; }
        .site { margin: 0 0 6mm; color: #475569; }
        section { margin: 0 0 7mm; break-inside: avoid; }
        h2 { margin: 0 0 2mm; padding: 2mm 0; border-bottom: 1px solid #64748b; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { padding: 2mm; border: 1px solid #cbd5e1; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
        th { background: #e2e8f0; }
      </style></head><body>
      <h1>${title}</h1><p class="site">Site : ${escapeHtml(siteName || selectedSiteName)} · Imprimé le ${escapeHtml(new Date().toLocaleString("fr-FR"))}</p>
      ${sections}<script>window.onload=()=>window.print();window.onafterprint=()=>window.close();</script>
      </body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Pond Bascul" subtitle="Registre des pesées : client ou fournisseur, produit, BRUT, TARE, NET et remarque." />
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
      <div className="max-w-xl">
        <SitePicker
          id="pond-brut-site"
          value={selectedSiteName}
          type={site?.type || siteType}
          sites={sites}
          canCreate={canCreateSite}
          onAdd={addSite}
          onChange={(name, type) => { setSiteName(name); setSiteType(type); }}
        />
      </div>
      <Panel title="Registre des pesées">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-[260px] max-w-md flex-1 items-center gap-2 rounded-md border bg-background px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input aria-label="Rechercher une pesée" className="border-0 px-0 shadow-none focus-visible:ring-0" placeholder="Rechercher une date, un véhicule, un client, un produit…" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <Button type="button" variant="outline" disabled={!filteredEntries.length} onClick={printRegister}>
            <Printer className="mr-2 h-4 w-4" /> Imprimer le registre
          </Button>
        </div>
        <div className="overflow-auto rounded-md border">
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>{["Date", "Véhicule", "Client / Fournisseur", "Produit", "BRUT", "TARE", "NET", "Observations", "Impression"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="px-4 py-3">{displayDate(entry.date)}{entry.pendingSync && <span className="mt-1 block text-xs text-amber-700" title={entry.pendingSyncError || undefined}>{entry.pendingSyncStatus === "conflict" ? "Conflit à résoudre" : entry.pendingSyncStatus === "rejected" ? "À vérifier" : "En attente réseau"}</span>}</td>
                  <td className="px-4 py-3 font-medium">{entry.vehicule || "—"}</td>
                  <td className="px-4 py-3">{entry.clientFournisseur || "—"}</td>
                  <td className="px-4 py-3">{entry.produit || "—"}</td>
                  <td className="px-4 py-3">{entry.brut}</td>
                  <td className="px-4 py-3">{entry.tare}</td>
                  <td className="px-4 py-3 font-semibold">{entry.net}</td>
                  <td className="max-w-md whitespace-pre-wrap px-4 py-3">{entry.remarque || entry.observation || "—"}</td>
                  <td className="px-4 py-3"><Button type="button" size="icon" variant="ghost" aria-label="Imprimer cette pesée" title="Imprimer cette pesée" onClick={() => printEntry(entry)}><Printer className="size-4" /></Button></td>
                </tr>
              ))}
              {!filteredEntries.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">{entries.length ? "Aucune pesée ne correspond à la recherche." : "Aucune pesée enregistrée pour ce site."}</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}