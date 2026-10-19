interface ChartStatistiqueProps {
  period: string;
  series: number[];
}

export default function ChartStatistique({ period, series }: ChartStatistiqueProps) {
  return (
    <section className="mt-8 border-t pt-5">
      <h2 className="text-sm font-semibold">Fréquentation du site</h2>
      <div className="mt-6 flex h-60 items-end gap-3 border-b pb-6">
        {series.map((v, i) => (
          <div key={`${period}-${i}`} className="flex h-full flex-1 flex-col justify-end gap-2 text-center">
            <span className="text-xs text-muted-foreground">{v}</span>
            <div className={`mx-auto w-full max-w-20 rounded-t-sm bg-primary/75 ${v < 10 ? 'h-8' : v < 20 ? 'h-16' : v < 40 ? 'h-24' : v < 65 ? 'h-32' : 'h-40'}`} />
            <span className="text-[10px] text-muted-foreground">
              {period === 'jour' ? `${6 + (i * 2)} h` : period === 'semaine' ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i] : `Sem. ${i + 1}`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}