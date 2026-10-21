import { useCallback, useEffect, useState } from "react";
import { serviceApi } from "@/lib/service-api";

export type SiteOption = { id: string; name: string; type: "USINE" | "AGENCE" };

export function useSites() {
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [canCreateSite, setCanCreateSite] = useState(false);
  const [canDeleteSite, setCanDeleteSite] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    serviceApi.listSites()
      .then((result) => {
        setSites(result.sites);
        setCanCreateSite(result.canCreate);
        setCanDeleteSite(result.canDelete);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Chargement des sites impossible"));
  }, []);

  const addSite = useCallback(async (name: string, type: SiteOption["type"]) => {
    const site = await serviceApi.createSite({ name, type });
    setSites((current) => current.some((item) => item.id === site.id)
      ? current
      : [...current, site].sort((a, b) => a.name.localeCompare(b.name)));
    return site;
  }, []);

  const archiveSite = useCallback(async (id: string) => {
    await serviceApi.archiveSite(id);
    setSites((current) => current.filter((site) => site.id !== id));
  }, []);

  return { sites, canCreateSite, canDeleteSite, siteError: error, addSite, archiveSite };
}
