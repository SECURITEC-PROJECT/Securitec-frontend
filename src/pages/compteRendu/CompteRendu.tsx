import { PageHeader } from "@/components/PageHeader";
import { API_URL, authHeaders } from "@/lib/api";
import { useDemoTable } from "@/lib/demo-store";
import AlcootestPanel from "@/pages/agentControle/controleAcces/AlcootestPanel";
import { useEffect, useState } from "react";
import FormCompteRendu from "./FormCompteRendu";
import GenerateurCRJ, { type CRJData } from "./GenerateurCRJ";
import ListCompteRendu from "./ListCompteRendu";
import ValidationCRJ from "./ValidationCRJ";

interface Option {
  id: string;
  nom: string;
  typeSite?: "USINE" | "AGENCE";
}

const selectClass = "h-9 min-w-56 rounded-md border border-input bg-background px-3 text-xs";

export default function ComptesRendus() {
  const reportsData = useDemoTable("reports");

  // Onglet actif : Saisie & Historique, Alcootest ou Aperçu/Impression du CRJ
  const [activeTab, setActiveTab] = useState<'saisie' | 'alcootest' | 'apercu'>('saisie');

  // Sélecteurs : prestataire, site de travail et date du CRJ
  const [prestataires, setPrestataires] = useState<Option[]>([]);
  const [sites, setSites] = useState<Option[]>([]);
  const [prestataireId, setPrestataireId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA")); // AAAA-MM-JJ

  // CRJ généré automatiquement par le backend
  const [crj, setCrj] = useState<CRJData | null>(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [refresh, setRefresh] = useState(0);

  const selectedSite = sites.find((s) => s.id === siteId);
  const siteTypeLabel = selectedSite?.typeSite === "AGENCE" ? "Agence" : "Usine";

  // Charger les prestataires et les sites depuis la base de données
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/crj/options`, { headers: authHeaders(), signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Chargement des options CRJ impossible.");
        return data;
      })
      .then((data) => {
        if (data.prestataires?.length) {
          setPrestataires(data.prestataires);
          setPrestataireId(data.prestataires[0].id);
        }
        if (data.sites?.length) {
          setSites(data.sites);
          setSiteId(data.sites[0].id);
        }
      })
      .catch((err) => { if (err.name !== "AbortError") console.error("Erreur chargement options CRJ:", err); });
    return () => controller.abort();
  }, []);

  // Générer le CRJ dès que le prestataire, le site ou la date change
  useEffect(() => {
    if (activeTab !== "apercu" || !prestataireId || !siteId || !date) return;

    const controller = new AbortController();
    setLoading(true);
    setErreur("");

    const params = new URLSearchParams({ prestataireId, siteId, date });
    fetch(`${API_URL}/crj?${params}`, { headers: authHeaders(), signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Erreur serveur");
        setCrj(data);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setCrj(null);
        setErreur(err.message || "Impossible de générer le CRJ.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeTab, prestataireId, siteId, date, refresh]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Comptes Rendus Journaliers (CRJ)" 
        subtitle="Saisie, contrôle de l'alcoolémie sur demande et génération automatique du rapport opposable (HH:MM)" 
      />

      {/* SÉLECTEURS DU CRJ & ONGLETS */}
      <div className="flex flex-wrap items-end justify-between gap-4 p-4 border rounded-lg bg-card shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Prestataire</label>
            <select value={prestataireId} onChange={(e) => setPrestataireId(e.target.value)} className={`${selectClass} block`}>
              {prestataires.map((p) => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Site de travail</label>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className={`${selectClass} block`}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${selectClass} block min-w-40`} />
          </div>
        </div>

        {/* ONGLETS DE NAVIGATION DE LA PAGE */}
        <div className="flex gap-2 border-l pl-4">
          <button
            onClick={() => setActiveTab('saisie')}
            className={`px-3 py-1.5 text-xs font-medium rounded ${activeTab === 'saisie' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            Saisie & Rapports
          </button>
          <button
            onClick={() => setActiveTab('alcootest')}
            className={`px-3 py-1.5 text-xs font-medium rounded ${activeTab === 'alcootest' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            Contrôle Alcoolémie (Supérieur)
          </button>
          <button
            onClick={() => setActiveTab('apercu')}
            className={`px-3 py-1.5 text-xs font-medium rounded ${activeTab === 'apercu' ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted'}`}
          >
            🖨️ Aperçu CRJ Généré ({siteTypeLabel})
          </button>
        </div>
      </div>

      {/* CLÔTURE DU CRJ */}
      <ValidationCRJ />

      {/* CONTENU SELON L'ONGLET SÉLECTIONNÉ */}
      {activeTab === 'saisie' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <FormCompteRendu />
          <ListCompteRendu data={reportsData} />
        </div>
      )}

      {activeTab === 'alcootest' && (
        <div className="max-w-2xl mx-auto">
          <AlcootestPanel siteId={siteId} onAddEntry={() => setRefresh((n) => n + 1)} />
        </div>
      )}

      {activeTab === 'apercu' && (
        <>
          {loading && <p className="text-xs text-muted-foreground">Génération du rapport en cours…</p>}
          {erreur && <p className="text-xs font-medium text-red-600">✕ {erreur}</p>}
          {!loading && !erreur && crj && <GenerateurCRJ data={crj} />}
          {!loading && !erreur && !crj && (
            <p className="text-xs text-muted-foreground">Choisissez un prestataire, un site et une date pour générer le CRJ.</p>
          )}
        </>
      )}
    </div>
  );
}
