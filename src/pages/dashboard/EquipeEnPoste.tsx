interface EquipeEnPosteProps {
  shifts: any[];
  name: (id: string) => string;
}

export default function EquipeEnPoste({ shifts, name }: EquipeEnPosteProps) {
  const activeShifts = shifts.filter((s) => !s.ended_at);

  return (
    <section>
      <div className="mb-3 flex justify-between">
        <h2 className="text-sm font-semibold">Équipe en poste</h2>
        <span className="text-xs text-success">{activeShifts.length} agents</span>
      </div>
      <div className="divide-y border-y">
        {activeShifts.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
              {(s.agent_name || name(s.agent_id)).split(" ").map((x: string) => x[0]).join("")}
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold">{s.agent_name || name(s.agent_id)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Agent 0{i + 1} · {s.post_name?.split(" · ")[0] || s.site || "Vacation active"}</p>
            </div>
            <span className="text-[10px] text-success">En poste</span>
          </div>
        ))}
      </div>
    </section>
  );
}