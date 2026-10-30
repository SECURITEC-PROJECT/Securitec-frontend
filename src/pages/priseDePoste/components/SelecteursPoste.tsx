import { Label } from "@/components/ui/label";

interface OptionItem {
  id: string;
  prestataire?: string;
  site?: string;
}

interface SelecteursPosteProps {
  sites: OptionItem[];
  siteDeTravail: string;
  setSiteDeTravail: (val: string) => void;
  onSiteChange?: (name: string, id: string) => void;
}

export default function SelecteursPoste({
  sites,
  siteDeTravail,
  setSiteDeTravail,
  onSiteChange,
}: SelecteursPosteProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <Label htmlFor="site_de_travail">Site de travail</Label>
        <select
          id="site_de_travail"
          value={siteDeTravail}
          onChange={(e) => {
            const selected = sites.find((site) => site.site === e.target.value);
            setSiteDeTravail(e.target.value);
            onSiteChange?.(e.target.value, selected?.id || "");
          }}
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
