import { Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SiteOption } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { toast } from "sonner";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const emptyForm = {
  full_name: "", company: "", id_document: "", host: "", site_name: "", site_type: "USINE",
  reason: "", badge: "", vehicle: "", zone: "", document_type: "", equipment: "",
};

// Titre de section (occupe toute la largeur de la grille)
function Section({ children }: { children: ReactNode }) {
  return (
    <p className="col-span-2 mt-2 border-b pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">
      {children}
    </p>
  );
}

interface FormPietonProps {
  onCreated: (visitor: any) => void;
  sites: SiteOption[];
  canCreateSite: boolean;
  onAddSite: (name: string, type: SiteOption["type"]) => Promise<SiteOption>;
  // Visiteurs déjà enregistrés : servent à suggérer les noms
  knownVisitors: any[];
}

export default function FormPieton({ onCreated, sites, canCreateSite, onAddSite, knownVisitors }: FormPietonProps) {
  const [f, setF] = useState<Record<string, string>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [active, setActive] = useState(-1);

  // Personnes déjà présentes dont le nom contient ce qui est tapé (sans accents ni majuscules)
  const suggestions = useMemo(() => {
    const q = normalize(f.full_name || "");
    if (q.length < 2) return [];

    const seen = new Set<string>();
    const matches: any[] = [];
    for (const v of knownVisitors) {
      const name = String(v.full_name ?? "").trim();
      const key = normalize(name);
      if (!key || seen.has(key) || !key.includes(q)) continue;
      seen.add(key);
      matches.push(v);
    }

    // Les noms qui commencent par la saisie passent en premier
    matches.sort((a, b) => {
      const sa = normalize(String(a.full_name)).startsWith(q) ? 0 : 1;
      const sb = normalize(String(b.full_name)).startsWith(q) ? 0 : 1;
      return sa - sb;
    });
    return matches.slice(0, 6);
  }, [f.full_name, knownVisitors]);

  const selectSuggestion = (v: any) => {
    setF((prev) => ({
      ...prev,
      full_name: String(v.full_name).trim(),
      // On complète les infos d'identité connues, sans écraser ce qui est déjà saisi
      company: prev.company || String(v.company ?? ""),
      id_document: prev.id_document || String(v.id_document ?? "").slice(-4),
      document_type: prev.document_type || String(v.document_type ?? ""),
    }));
    setShowSuggestions(false);
    setActive(-1);
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[active]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const badge = f.badge.trim();
    setSaving(true);
    try {
      const visitor = await serviceApi.createVisitor({ ...f, badge, siteName: f.site_name, siteType: f.site_type });
      onCreated(visitor);
      toast.success("Entrée visiteur enregistrée dans la base de données");
      setF(emptyForm);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally { setSaving(false); }
  };

  // Champ texte simple
  const champ = (
    k: string,
    label: string,
    opts: { required?: boolean; maxLength?: number; placeholder?: string; span?: boolean } = {}
  ) => (
    <div className={opts.span ? "col-span-2" : ""}>
      <Label htmlFor={k} className="text-xs">{label}</Label>
      <Input
        id={k}
        className="mt-1 h-9"
        maxLength={opts.maxLength}
        required={opts.required}
        placeholder={opts.placeholder}
        value={f[k] || ""}
        onChange={(e) => {
          const value = e.target.value;
          setF((prev) => ({ ...prev, [k]: value }));
        }}
      />
    </div>
  );

  return (
    <Panel title="Enregistrer une entrée">
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        <Section>Site</Section>
        <div>
          <SitePicker id="visitor-site" value={f.site_name} type={f.site_type as SiteOption["type"]} sites={sites} canCreate={canCreateSite} onAdd={onAddSite} onChange={(siteName, siteType) => setF((previous) => ({ ...previous, site_name: siteName, site_type: siteType }))} />
        </div>
        <div>
          <Label htmlFor="visitor-site-type" className="text-xs">Type de site</Label>
          <select id="visitor-site-type" value={f.site_type} onChange={(e) => setF({ ...f, site_type: e.target.value })} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="USINE">Usine</option>
            <option value="AGENCE">Agence</option>
          </select>
        </div>

        <Section>Visiteur</Section>
        {/* Nom et prénom avec suggestions des personnes déjà présentes */}
        <div className="relative col-span-2">
          <Label htmlFor="full_name" className="text-xs">Nom et prénom *</Label>
          <Input
            id="full_name"
            required
            autoComplete="off"
            className="mt-1 h-9"
            value={f.full_name || ""}
            onChange={(e) => {
              const value = e.target.value;
              setF((prev) => ({ ...prev, full_name: value }));
              setShowSuggestions(true);
              setActive(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setShowSuggestions(false)}
            onKeyDown={handleNameKeyDown}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background py-1 shadow-md"
            >
              {suggestions.map((v, i) => (
                <li
                  key={v.id ?? v.full_name}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault(); // garde le focus pour que le clic soit pris en compte
                    selectSuggestion(v);
                  }}
                  className={`cursor-pointer px-3 py-1.5 text-sm ${i === active ? "bg-accent" : "hover:bg-accent"}`}
                >
                  <p className="font-medium">{v.full_name}</p>
                  {v.company && <p className="text-xs text-muted-foreground">{v.company}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
        {champ("company", "Société")}
        {champ("document_type", "Type de pièce", { placeholder: "CIN, passeport…" })}
        {champ("id_document", "Pièce d'identité", { maxLength: 4, placeholder: "4 derniers caractères" })}
        {champ("badge", "N° badge")}

        <Section>Visite</Section>
        {champ("host", "Personne visitée *", { required: true })}
        {champ("zone", "Zone autorisée")}
        {champ("reason", "Motif *", { required: true, span: true })}

        <Section>Véhicule et matériel</Section>
        {champ("vehicle", "Immatriculation")}
        {champ("equipment", "Matériel apporté", { placeholder: "PC, outillage…" })}

        <Button type="submit" disabled={saving} className="col-span-2 mt-2 h-10 w-full">
          {saving ? "Enregistrement…" : "Valider l'entrée"}
        </Button>
      </form>
    </Panel>
  );
}