import { Label } from "@/components/ui/label";

interface OptionItem {
  id: string;
  prestataire?: string;
  site?: string;
}

interface SelecteursPosteProps {
  prestataires: OptionItem[];
  sites: OptionItem[];
  prestataire: string;
  setPrestataire: (val: string) => void;
  siteDeTravail: string;
  setSiteDeTravail: (val: string) => void;
}

export default function SelecteursPoste({
  prestataires,
  sites,
  prestataire,
  setPrestataire,
  siteDeTravail,
  setSiteDeTravail,
}: SelecteursPosteProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="prestataire">Prestataire</Label>
        <select
          id="prestataire"
          value={prestataire}
          onChange={(e) => setPrestataire(e.target.value)}
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {prestataires.map((p) => (
            <option key={p.id} value={p.prestataire}>
              {p.prestataire}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="site_de_travail">Site de travail</Label>
        <select
          id="site_de_travail"
          value={siteDeTravail}
          onChange={(e) => setSiteDeTravail(e.target.value)}
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {sites.map((s) => (
            <option key={s.id} value={s.site}>
              {s.site}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}