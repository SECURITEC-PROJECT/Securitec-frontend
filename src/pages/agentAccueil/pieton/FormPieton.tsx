import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { serviceApi } from "@/lib/service-api";
import type { VisitorRecord } from "@/types/visitor";
import { useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { toast } from "sonner";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const emptyForm = {
  full_name: "", company: "",
  reason: "", badge: "",
  entryDate: new Date().toLocaleDateString("en-CA"), entryTime: new Date().toTimeString().slice(0, 5),
};

function dateTimeParts(value?: string | Date | null) {
  if (!value) return { date: "", time: "" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: "", time: "" };
  return {
    date: `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`,
    time: `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`,
  };
}

function formForVisitor(visitor: VisitorRecord | null): Record<string, string> {
  if (!visitor) return emptyForm;
  const entered = dateTimeParts(visitor.entered_at);
  return {
    ...emptyForm,
    full_name: visitor.full_name || "",
    company: visitor.company || "",
    reason: visitor.reason || "",
    badge: visitor.badge || "",
    entryDate: entered.date || emptyForm.entryDate,
    entryTime: entered.time,
  };
}

// Titre de section (occupe toute la largeur de la grille)
function Section({ children }: { children: ReactNode }) {
  return (
    <p className="col-span-2 mt-2 border-b pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0 lg:col-span-4">
      {children}
    </p>
  );
}

interface FormPietonProps {
  onCreated: (visitor: VisitorRecord) => void;
  onUpdated: (visitor: VisitorRecord) => void;
  editingVisitor: VisitorRecord | null;
  onCancelEditing: () => void;
  siteId: string;
  siteName: string;
  siteType: string;
  // Visiteurs déjà enregistrés : servent à suggérer les noms
  knownVisitors: VisitorRecord[];
}

export default function FormPieton({
  onCreated, onUpdated, editingVisitor, onCancelEditing, siteId, siteName, siteType, knownVisitors,
}: FormPietonProps) {
  const [f, setF] = useState<Record<string, string>>(() => formForVisitor(editingVisitor));
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [active, setActive] = useState(-1);

  // Personnes déjà présentes dont le nom contient ce qui est tapé (sans accents ni majuscules)
  const suggestions = useMemo(() => {
    const q = normalize(f.full_name || "");
    if (q.length < 2) return [];

    const seen = new Set<string>();
    const matches: VisitorRecord[] = [];
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

  const selectSuggestion = (v: VisitorRecord) => {
    setF((prev) => ({
      ...prev,
      full_name: String(v.full_name).trim(),
      // On complète les infos d'identité connues, sans écraser ce qui est déjà saisi
      company: prev.company || String(v.company ?? ""),
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
      const payload = { ...f, badge, siteId, siteName, siteType };
      if (editingVisitor) {
        const visitor = await serviceApi.updateVisitor(String(editingVisitor.id), payload);
        onUpdated(visitor);
        toast.success("Passage visiteur modifié.");
      } else {
        const visitor = await serviceApi.createVisitor(payload);
        onCreated(visitor);
        toast.success("Entrée visiteur enregistrée dans la base de données");
        setF(emptyForm);
      }
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
    <div className={opts.span ? "col-span-2 lg:col-span-4" : ""}>
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
    <Panel title={editingVisitor ? "Modifier un passage visiteur" : "Enregistrer une entrée"}>
      <form onSubmit={(event) => void handleSubmit(event)} className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
        <Section>Visiteur</Section>
        {/* Nom et prénom avec suggestions des personnes déjà présentes */}
        <div className="relative col-span-2 lg:col-span-4">
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
        {champ("company", "Établissement")}
        <div>
          <Label htmlFor="badge" className="text-xs">Numéro de badge</Label>
          <Input
            id="badge"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            className="mt-1 h-9"
            value={f.badge || ""}
            onChange={(event) => setF((previous) => ({ ...previous, badge: event.target.value }))}
          />
        </div>

        <Section>Visite</Section>
        {champ("reason", "Motif *", { required: true, span: true })}

        <Section>Date et heure d’entrée</Section>
        <div>
          <Label htmlFor="visitor-entry-date" className="text-xs">Date d’entrée *</Label>
          <Input id="visitor-entry-date" type="date" required className="mt-1 h-9" value={f.entryDate} onChange={(event) => setF({ ...f, entryDate: event.target.value })} />
        </div>
        <div>
          <Label htmlFor="visitor-entry-time" className="text-xs">Heure d’entrée *</Label>
          <Input id="visitor-entry-time" type="time" required className="mt-1 h-9" value={f.entryTime} onChange={(event) => setF({ ...f, entryTime: event.target.value })} />
        </div>

        <div className="col-span-2 mt-2 flex gap-2 lg:col-span-4">
          {editingVisitor && (
            <Button type="button" variant="outline" disabled={saving} onClick={onCancelEditing} className="h-10 flex-1">
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={saving || !siteId} className="h-10 flex-1">
            {saving ? "Enregistrement…" : editingVisitor ? "Enregistrer les modifications" : "Valider l'entrée"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}