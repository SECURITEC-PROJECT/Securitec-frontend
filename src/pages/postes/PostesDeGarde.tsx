import { PageHeader } from "@/components/PageHeader";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";

type Post = { id: string; nom: string };
type Shift = { id: string; serviceId?: string; posteId?: string; posteNom?: string; nom: string; prenom: string; matricule: string; shiftType?: string; fonctionService?: string; ended_at?: string | null };

export default function PostesDeGarde() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { if (!siteId && sites.length) setSiteId(sites[0].id); }, [siteId, sites]);
  useEffect(() => {
    if (!siteId) { setPosts([]); setShifts([]); setLoading(false); return; }
    let active = true;
    setLoading(true); setError("");
    Promise.all([serviceApi.listShiftPosts(siteId), serviceApi.listShifts(siteId)])
      .then(([nextPosts, nextShifts]) => { if (active) { setPosts(nextPosts); setShifts(nextShifts); } })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Chargement des postes impossible."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [siteId]);

  return <div className="space-y-6">
    <PageHeader title="Postes de garde" subtitle="Choisissez un poste pour ouvrir ses cahiers, ses consignes et sa passation." />
    {sites.length > 1 && <div className="max-w-sm space-y-1.5"><label htmlFor="post-site" className="text-sm font-medium">Site</label><select id="post-site" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={siteId} onChange={(event) => setSiteId(event.target.value)}>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></div>}
    {(siteError || error) && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{siteError || error}</p>}
    {loading ? <p className="text-sm text-muted-foreground">Chargement des postes…</p> : !posts.length ? <p className="rounded-lg border p-6 text-sm text-muted-foreground">Aucun poste actif n’est configuré pour ce site.</p> :
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{posts.map((post) => {
        const crew = shifts.filter((shift) => !shift.ended_at && shift.posteId === post.id);
        const service = crew[0];
        return <Link key={post.id} to={`/dashboard/postes/${post.id}`} state={{ siteId, posteId: post.id, posteNom: post.nom }} className="group rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm">
          <div className="flex items-start justify-between gap-3"><div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div><ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" /></div>
          <h2 className="mt-4 text-lg font-semibold">{post.nom}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{service ? `Service ${service.shiftType === "NUIT" ? "de nuit" : "de jour"} · ${crew.length} agent${crew.length > 1 ? "s" : ""}` : "Aucun service ouvert"}</p>
          {crew.length > 0 && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{crew.map((agent) => `${agent.prenom} ${agent.nom}`).join(" · ")}</p>}
        </Link>;
      })}</div>}
  </div>;
}
