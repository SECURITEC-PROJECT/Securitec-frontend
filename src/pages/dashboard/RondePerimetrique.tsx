import { ArrowUpRight, Route as RouteIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface RondePerimetriqueProps {
  patrols: any[];
  name: (id: string) => string;
}

export default function RondePerimetrique({ patrols, name }: RondePerimetriqueProps) {
  return (
    <section>
      <div className="mb-3 flex justify-between">
        <h2 className="text-sm font-semibold">Ronde périmétrique</h2>
        <Link to="/dashboard/rondes" className="text-xs text-primary">Suivre <ArrowUpRight className="inline h-3 w-3" /></Link>
      </div>
      {patrols.slice(0, 1).map((p) => (
        <div key={p.id}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RouteIcon className="h-4 w-4" />{name(p.agent_id)}
            <span className="ml-auto text-primary">{p.checkpoints.filter((c: any) => c.at).length} / {p.checkpoints.length} balises</span>
          </div>
          <div className="mt-3 grid grid-cols-8 gap-1.5">
            {p.checkpoints.map((c: any) => (
              <div key={c.name} title={c.name} className={`h-2 rounded-sm ${c.at ? "bg-success" : "bg-border"}`} />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">{p.ended_at ? "Ronde terminée" : "En cours · Prochaine balise : Local technique"}</p>
        </div>
      ))}
    </section>
  );
}