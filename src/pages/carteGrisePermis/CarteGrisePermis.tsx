import { PageHeader } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type ChauffeurRecord } from "@/lib/service-api";
import { Printer, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const nowTime = () => new Date().toTimeString().slice(0, 5);
const normalizeName = (value: string) =>
  value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toLocaleLowerCase("fr");
const isCarteGriseRecord = (record: { document_type?: string; zone?: string }) =>
  record.document_type === "CIN/Permis" && record.zone === "Contrôle";

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("fr-FR");
};
const formatTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

interface FormData {
  date: string;
  heure: string;
  nomPrenom: string;
  cin: string;
  permisConduire: string;
  vehicule: string;
  immatriculation: string;
  siteName: string;
  siteType: "USINE" | "AGENCE";
  motif: string;
  observations: string;
}

interface CarteGriseRecord {
  id: string;
  document_type?: string;
  zone?: string;
  full_name?: string;
  entered_at?: string | Date | null;
  id_document?: string;
  vehicle?: string;
  reason?: string;
  equipment?: string;
  site_name?: string;
  exited_at?: string | Date | null;
  exit_notes?: string;
}

const emptyForm: FormData = {
  date: today(),
  heure: nowTime(),
  nomPrenom: "",
  cin: "",
  permisConduire: "",
  vehicule: "",
  immatriculation: "",
  siteName: "",
  siteType: "USINE",
  motif: "",
  observations: "",
};

export default function CarteGrisePermis() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<CarteGriseRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [registryError, setRegistryError] = useState("");
  const [search, setSearch] = useState("");
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [chauffeurRegistry, setChauffeurRegistry] = useState<{
    siteId: string;
    chauffeurs: ChauffeurRecord[];
    error: string;
  }>({ siteId: "", chauffeurs: [], error: "" });
  const [chauffeurSuggestionsOpen, setChauffeurSuggestionsOpen] = useState(false);
  const [activeChauffeurSuggestion, setActiveChauffeurSuggestion] = useState(0);
  const [selectedChauffeurId, setSelectedChauffeurId] = useState("");
  const selectedSite = sites.find((site) => site.name === form.siteName);
  const registeredChauffeurs = chauffeurRegistry.siteId === selectedSite?.id
    ? chauffeurRegistry.chauffeurs
    : [];
  const chauffeurLoading = Boolean(selectedSite?.id) && chauffeurRegistry.siteId !== selectedSite?.id;
  const chauffeurError = chauffeurRegistry.siteId === selectedSite?.id ? chauffeurRegistry.error : "";
  const matchingChauffeurs = registeredChauffeurs.filter((driver) =>
    !normalizeName(form.nomPrenom) || normalizeName(driver.nomPrenom).includes(normalizeName(form.nomPrenom)),
  ).slice(0, 8);

  useEffect(() => {
    let active = true;
    const siteId = selectedSite?.id;
    if (!siteId) return () => { active = false; };
    serviceApi.listChauffeurs(siteId)
      .then((chauffeurs) => {
        if (active) setChauffeurRegistry({ siteId, chauffeurs, error: "" });
      })
      .catch((error) => {
        if (active) setChauffeurRegistry({
          siteId,
          chauffeurs: [],
          error: error instanceof Error ? error.message : "Chargement des chauffeurs impossible.",
        });
      });
    return () => { active = false; };
  }, [selectedSite?.id]);

  const selectChauffeur = (driver: ChauffeurRecord) => {
    setSelectedChauffeurId(driver.id);
    setForm((current) => ({
      ...current,
      nomPrenom: driver.nomPrenom,
      cin: driver.cin || "",
      permisConduire: driver.numeroPermis || "",
      vehicule: driver.vehicule || "",
      immatriculation: driver.matricule || "",
    }));
    setChauffeurSuggestionsOpen(false);
  };

  const changeChauffeurName = (nomPrenom: string) => {
    setSelectedChauffeurId("");
    setForm((current) => ({
      ...current,
      nomPrenom,
      cin: "",
      permisConduire: "",
      vehicule: "",
      immatriculation: "",
    }));
    setActiveChauffeurSuggestion(0);
    setChauffeurSuggestionsOpen(true);
    const exactMatches = registeredChauffeurs.filter(
      (driver) => normalizeName(driver.nomPrenom) === normalizeName(nomPrenom),
    );
    if (exactMatches.length === 1) selectChauffeur(exactMatches[0]);
  };

  useEffect(() => {
    serviceApi.listVisitors()
      .then((visitors) => setRecords(visitors.filter(isCarteGriseRecord)))
      .catch((error) => setRegistryError(error instanceof Error ? error.message : "Chargement du registre impossible"))
      .finally(() => setLoadingRecords(false));
  }, []);

  const filteredRecords = records.filter((record) =>
    [
      record.full_name,
      record.id_document,
      record.vehicle,
      record.reason,
      record.equipment,
      record.site_name,
    ].some((value) => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
  );
  const handleExit = async (record: CarteGriseRecord) => {
    if (!window.confirm(`Confirmer la sortie de ${record.full_name || "cette personne"} ? Vérifiez que les documents lui ont été rendus.`)) return;
    setExitingId(record.id);
    setRegistryError("");
    try {
      await serviceApi.exitVisitor(record.id, { equipmentOut: true, extraEquipment: "" });
      const visitors = await serviceApi.listVisitors();
      setRecords(visitors.filter(isCarteGriseRecord));
      toast.success("Sortie enregistrée dans l'historique");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Enregistrement de la sortie impossible";
      setRegistryError(message);
      toast.error(message);
    } finally {
      setExitingId(null);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "Registre carte grise et permis";
    window.addEventListener("afterprint", () => {
      document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (chauffeurLoading) {
      toast.error("Veuillez attendre le chargement des fiches chauffeurs.");
      return;
    }
    if (chauffeurError) {
      toast.error("Impossible de vérifier les chauffeurs enregistrés. Réessayez après le chargement.");
      return;
    }
    if (!registeredChauffeurs.some((driver) => driver.id === selectedChauffeurId)) {
      toast.error("Sélectionnez un chauffeur enregistré pour remplir ses informations.");
      return;
    }
    if (!form.nomPrenom.trim()) {
      toast.error("Le nom et prénom sont obligatoires");
      return;
    }
    if (!form.permisConduire.trim()) {
      toast.error("Le permis de conduire est obligatoire");
      return;
    }
    if (!form.immatriculation.trim()) {
      toast.error("L'immatriculation est obligatoire");
      return;
    }
    setSaving(true);
    try {
      const record = await serviceApi.createVisitor({
        full_name: form.nomPrenom.trim(),
        company: "",
        id_document: form.cin.trim().slice(-4),
        document_type: "CIN/Permis",
        host: form.nomPrenom.trim(),
        reason: form.motif.trim() || "Vérification carte grise / permis de conduire",
        badge: "",
        vehicle: form.immatriculation.trim().toUpperCase(),
        zone: "Contrôle",
        equipment: `Permis: ${form.permisConduire.trim()}, Véhicule: ${form.vehicule.trim()}, Observations: ${form.observations.trim()}`,
        siteName: form.siteName,
        siteType: form.siteType,
        entry_date: form.date,
        entry_time: form.heure,
      });
      setRecords((current) => [record, ...current]);
      toast.success("Enregistrement carte grise / permis effectué");
      setSelectedChauffeurId("");
      setChauffeurSuggestionsOpen(false);
      setForm({ ...emptyForm, date: today(), heure: nowTime(), siteName: form.siteName, siteType: form.siteType });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carte grise / Permis de conduire"
        subtitle="Vérification et enregistrement des documents véhicules et permis"
      />
      <div className="space-y-6">
          <form className="space-y-4 rounded-lg border bg-card p-4 shadow-sm" onSubmit={handleSubmit}>
            <h2 className="font-semibold text-primary">Enregistrement carte grise / permis</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="heure">Heure de pointage</Label>
                <Input
                  id="heure"
                  type="time"
                  value={form.heure}
                  onChange={(e) => setForm({ ...form, heure: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <SitePicker
                id="carte-site"
                value={form.siteName}
                type={form.siteType}
                sites={sites}
                canCreate={canCreateSite}
                onAdd={addSite}
                onChange={(siteName, siteType) => {
                  setSelectedChauffeurId("");
                  setChauffeurSuggestionsOpen(false);
                  setForm({ ...form, siteName, siteType, nomPrenom: "", cin: "", permisConduire: "", vehicule: "", immatriculation: "" });
                }}
              />
            </div>

              <div>
                <Label htmlFor="nomPrenom">Nom et prénom *</Label>
                <Popover open={chauffeurSuggestionsOpen && matchingChauffeurs.length > 0} onOpenChange={setChauffeurSuggestionsOpen}>
                  <PopoverAnchor asChild>
                    <Input
                      id="nomPrenom"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={chauffeurSuggestionsOpen && matchingChauffeurs.length > 0}
                      aria-controls="carte-chauffeur-suggestions"
                      aria-activedescendant={matchingChauffeurs[activeChauffeurSuggestion] ? `carte-chauffeur-option-${activeChauffeurSuggestion}` : undefined}
                      value={form.nomPrenom}
                      onChange={(event) => changeChauffeurName(event.target.value)}
                      onFocus={() => setChauffeurSuggestionsOpen(true)}
                      onKeyDown={(event) => {
                        if (!matchingChauffeurs.length) return;
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          setActiveChauffeurSuggestion((current) => (current + 1) % matchingChauffeurs.length);
                        } else if (event.key === "ArrowUp") {
                          event.preventDefault();
                          setActiveChauffeurSuggestion((current) => (current - 1 + matchingChauffeurs.length) % matchingChauffeurs.length);
                        } else if (event.key === "Enter" && chauffeurSuggestionsOpen) {
                          event.preventDefault();
                          const driver = matchingChauffeurs[activeChauffeurSuggestion];
                          if (driver) selectChauffeur(driver);
                        } else if (event.key === "Escape") {
                          setChauffeurSuggestionsOpen(false);
                        }
                      }}
                      required
                      autoComplete="off"
                      placeholder={chauffeurLoading ? "Chargement des chauffeurs…" : "Rechercher un nom enregistré"}
                    />
                  </PopoverAnchor>
                  <PopoverContent
                    id="carte-chauffeur-suggestions"
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] p-1"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                  >
                    <ul role="listbox" aria-label="Chauffeurs enregistrés" className="max-h-52 overflow-y-auto">
                      {matchingChauffeurs.map((driver, index) => (
                        <li key={driver.id} role="presentation">
                          <button
                            id={`carte-chauffeur-option-${index}`}
                            type="button"
                            role="option"
                            aria-selected={index === activeChauffeurSuggestion}
                            className={`w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent ${index === activeChauffeurSuggestion ? "bg-accent" : ""}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectChauffeur(driver)}
                          >
                            <span>{driver.nomPrenom}</span>
                            {driver.vehicule && <span className="ml-2 text-muted-foreground">— {driver.vehicule}</span>}
                            {driver.matricule && <span className="ml-2 text-muted-foreground">({driver.matricule})</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </PopoverContent>
                </Popover>
                {chauffeurError
                  ? <p role="alert" className="mt-1 text-xs text-destructive">{chauffeurError}</p>
                  : chauffeurLoading
                    ? <p className="mt-1 text-xs text-muted-foreground">Chargement des fiches chauffeurs du site…</p>
                    : !registeredChauffeurs.length
                      ? <p className="mt-1 text-xs text-muted-foreground">Aucun chauffeur enregistré pour ce site.</p>
                      : form.nomPrenom.trim() && !selectedChauffeurId
                        ? <p role="alert" className="mt-1 text-xs text-destructive">Choisissez un nom dans les chauffeurs enregistrés.</p>
                        : <p className="mt-1 text-xs text-muted-foreground">Choisissez un chauffeur pour remplir automatiquement la CIN, le permis et les informations du véhicule.</p>}
              </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="cin">CIN</Label>
                <Input
                  id="cin"
                  value={form.cin}
                  onChange={(e) => setForm({ ...form, cin: e.target.value })}
                  placeholder="Numéro de carte d'identité"
                />
              </div>
              <div>
                <Label htmlFor="permis">Permis de conduire *</Label>
                <Input
                  id="permis"
                  value={form.permisConduire}
                  onChange={(e) => setForm({ ...form, permisConduire: e.target.value })}
                  required
                  placeholder="N° de permis"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="vehicule">Véhicule</Label>
                <Input
                  id="vehicule"
                  value={form.vehicule}
                  onChange={(e) => setForm({ ...form, vehicule: e.target.value })}
                  placeholder="Marque / Modèle"
                />
              </div>
              <div>
                <Label htmlFor="immatriculation">Immatriculation *</Label>
                <Input
                  id="immatriculation"
                  value={form.immatriculation}
                  onChange={(e) => setForm({ ...form, immatriculation: e.target.value })}
                  required
                  placeholder="Ex. 1234 TBA"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="motif">Motif</Label>
              <Input
                id="motif"
                value={form.motif}
                onChange={(e) => setForm({ ...form, motif: e.target.value })}
                placeholder="Motif de la vérification"
              />
            </div>

            <div>
              <Label htmlFor="observations">Observations</Label>
              <textarea
                id="observations"
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {siteError && <p className="text-sm text-destructive">{siteError}</p>}
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </form>

        <section id="carte-grise-print-area" className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-primary">Registre carte grise / permis</h2>
            <Button type="button" variant="outline" className="print:hidden" disabled={!records.length} onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Imprimer le registre
            </Button>
          </div>
          {registryError && <p className="mb-3 text-sm text-destructive">{registryError}</p>}
          {loadingRecords ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Chargement du registre…</p>
          ) : (
            <div className="space-y-4">
              <div className="relative carte-grise-screen">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Rechercher dans le registre carte grise et permis"
                  placeholder="Rechercher par nom, CIN, immatriculation ou motif…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
              {records.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-12 text-center">
                  <p className="font-medium">Aucun enregistrement pour le moment</p>
                  <p className="mt-1 text-sm text-muted-foreground">Les contrôles enregistrés apparaîtront ici.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border carte-grise-screen">
                  <div className="max-h-[560px] overflow-auto">
                    <table className="w-full min-w-[1050px] text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/95 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                      <tr>
                        <th className="px-4 py-3">Entrée</th>
                        <th className="px-3 py-3">Sortie</th>
                        <th className="px-3 py-3">Statut</th>
                        <th className="px-3 py-3">Personne</th>
                        <th className="px-3 py-3">CIN</th>
                        <th className="px-3 py-3">Immatriculation</th>
                        <th className="px-3 py-3">Motif</th>
                        <th className="px-3 py-3">Détails</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className="align-top transition-colors hover:bg-muted/30">
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                            <span className="block font-medium text-foreground">{formatDate(record.entered_at)}</span>
                            <span className="mt-0.5 block text-muted-foreground">{formatTime(record.entered_at)}</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">
                            {record.exited_at ? (
                              <>
                                <span className="block font-medium text-foreground">{formatDate(record.exited_at)}</span>
                                <span className="mt-0.5 block text-muted-foreground">{formatTime(record.exited_at)}</span>
                              </>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${record.exited_at ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-800"}`}>
                              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${record.exited_at ? "bg-muted-foreground/60" : "bg-emerald-600"}`} />
                              {record.exited_at ? "Sorti" : "Présent"}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-medium">{record.full_name || "—"}</td>
                          <td className="px-3 py-3 font-mono text-xs">{record.id_document || "—"}</td>
                          <td className="px-3 py-3 font-mono text-xs font-semibold">{record.vehicle || "—"}</td>
                          <td className="max-w-[180px] px-3 py-3 text-muted-foreground">{record.reason || "—"}</td>
                          <td className="max-w-[240px] whitespace-pre-wrap break-words px-3 py-3 text-xs text-muted-foreground">{record.equipment || "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {!record.exited_at && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={exitingId !== null}
                                onClick={() => void handleExit(record)}
                              >
                                {exitingId === record.id ? "Sortie…" : "Sortie"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredRecords.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                            Aucun résultat pour cette recherche.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}
          {!loadingRecords && (
            <div className="carte-grise-print hidden">
              <h1 className="mb-1 text-xl font-bold">Registre carte grise / permis</h1>
              <p className="mb-4 text-sm">Imprimé le {new Date().toLocaleString("fr-FR")}</p>
              <table>
                <thead>
                  <tr>
                    {["Entrée", "Sortie", "Statut", "Personne", "CIN", "Immatriculation", "Motif", "Détails", "Site"].map((heading) => (
                      <th key={heading}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{formatDate(record.entered_at)} {formatTime(record.entered_at)}</td>
                      <td>{record.exited_at ? `${formatDate(record.exited_at)} ${formatTime(record.exited_at)}` : "—"}</td>
                      <td>{record.exited_at ? "Sorti" : "Présent"}</td>
                      <td>{record.full_name || "—"}</td>
                      <td>{record.id_document || "—"}</td>
                      <td>{record.vehicle || "—"}</td>
                      <td>{record.reason || "—"}</td>
                      <td>{record.equipment || "—"}</td>
                      <td>{record.site_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          #carte-grise-print-area, #carte-grise-print-area * { visibility: visible !important; }
          #carte-grise-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            border: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .carte-grise-screen { display: none !important; }
          .carte-grise-print { display: block !important; }
          .carte-grise-print table { width: 100%; border-collapse: collapse; font-size: 9pt; }
          .carte-grise-print th, .carte-grise-print td { border: 1px solid #777; padding: 5px; text-align: left; vertical-align: top; }
          .carte-grise-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
