export interface ChartPoint {
  label: string;
  value: number;
}

interface ChartStatistiqueProps {
  period: "jour" | "semaine" | "mois";
  series: ChartPoint[];
}

export default function ChartStatistique({ period, series }: ChartStatistiqueProps) {
  const maxValue = Math.max(1, ...series.map((point) => point.value));
  return <section className="mt-8 border-t pt-5">
    <h2 className="text-sm font-semibold">Entrées visiteurs · {period === "jour" ? "par heure" : period === "semaine" ? "par jour" : "par semaine"}</h2>
    {series.every((point) => point.value === 0) && <p className="mt-2 text-xs text-muted-foreground">Aucune entrée sur cette période.</p>}
    <div className="mt-6 flex h-60 items-end gap-1 overflow-x-auto border-b pb-6 sm:gap-2">
      {series.map((point) => {
        const height = point.value ? Math.max(8, (point.value / maxValue) * 150) : 0;
        return <div key={point.label} className="flex h-full min-w-5 flex-1 flex-col justify-end gap-2 text-center sm:min-w-8">
          {point.value > 0 && <span className="text-[10px] text-muted-foreground">{point.value}</span>}
          <div className="mx-auto w-full max-w-20 rounded-t-sm bg-primary/75" style={{ height: `${height}px` }} />
          <span className="text-[9px] text-muted-foreground sm:text-[10px]">{point.label}</span>
        </div>;
      })}
    </div>
  </section>;
}
