import { PageHeader, Panel } from "@/components/PageHeader";
import { serviceApi } from "@/lib/service-api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import FormPassation, { type HandoverForm } from "./FormPassation";
import ListPassation from "./ListPassation";

export default function Passation() {
  const [handovers, setHandovers] = useState<any[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string; type: "USINE" | "AGENCE" }[]>([]);
  const [canCreateSite, setCanCreateSite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = () => serviceApi.listPassations().then(setHandovers);
  useEffect(() => {
    Promise.all([serviceApi.listPassations(), serviceApi.listSites()])
      .then(([passations, siteData]) => {
        setHandovers(passations);
        setSites(siteData.sites);
        setCanCreateSite(siteData.canCreate);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAddSite = async (name: string, type: "USINE" | "AGENCE") => {
    const site = await serviceApi.createSite({ name, type });
    setSites((previous) => previous.some((item) => item.id === site.id) ? previous : [...previous, site].sort((a, b) => a.name.localeCompare(b.name)));
    return site;
  };

  const handleSave = async (form: HandoverForm) => {
    try {
      await serviceApi.createPassation(form);
      await refresh();
      toast.success("Passation enregistrée dans la base de données");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Enregistrement impossible";
      setError(message);
      throw reason;
    }
  };

  return <div>
    <PageHeader title="Passation" subtitle="Relève entre agents, matériel remis, faits et consignes du rapport journalier." />
    {error && <Panel title="Connexion backend"><p className="text-sm text-destructive">{error}</p></Panel>}
    {loading ? <Panel title="Chargement"><p className="text-sm text-muted-foreground">Chargement des passations…</p></Panel> : <div className="grid gap-6 lg:grid-cols-2">
      <FormPassation onSubmit={handleSave} sites={sites} canCreateSite={canCreateSite} onAddSite={handleAddSite} />
      <ListPassation handovers={handovers} />
    </div>}
  </div>;
}
