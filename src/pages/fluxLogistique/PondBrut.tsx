import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type PondBrutEntry } from "@/lib/service-api";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const displayDate = (value: string) => {
  const part = value.slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(part) ? new Date(`${part}T00:00:00.000Z`) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "—";
};

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
    serviceApi.listPondBrut(site.id)
      .then((rows) => { if (active) setEntries(rows); })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Chargement du registre Pond Bascul impossible."));
    return () => { active = false; };
  }, [site?.id]);

  const filteredEntries = entries.filter((entry) =>
    [entry.date, entry.vehicule, entry.clientFournisseur, entry.produit, entry.remarque, String(entry.brut), String(entry.tare), String(entry.net)]
      .some((value) => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
  );

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
        <div className="mb-4 flex max-w-md items-center gap-2 rounded-md border bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input aria-label="Rechercher une pesée" className="border-0 px-0 shadow-none focus-visible:ring-0" placeholder="Rechercher une date, un véhicule, un client, un produit…" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="overflow-auto rounded-md border">
          <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>{["Date", "Véhicule", "Client / Fournisseur", "Produit", "BRUT", "TARE", "NET", "Remarque"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="px-4 py-3">{displayDate(entry.date)}</td>
                  <td className="px-4 py-3 font-medium">{entry.vehicule || "—"}</td>
                  <td className="px-4 py-3">{entry.clientFournisseur || "—"}</td>
                  <td className="px-4 py-3">{entry.produit || "—"}</td>
                  <td className="px-4 py-3">{entry.brut}</td>
                  <td className="px-4 py-3">{entry.tare}</td>
                  <td className="px-4 py-3 font-semibold">{entry.net}</td>
                  <td className="max-w-md whitespace-pre-wrap px-4 py-3">{entry.remarque || entry.observation || "—"}</td>
                </tr>
              ))}
              {!filteredEntries.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{entries.length ? "Aucune pesée ne correspond à la recherche." : "Aucune pesée enregistrée pour ce site."}</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
