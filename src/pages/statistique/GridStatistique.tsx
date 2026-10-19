interface GridStatistiqueProps {
  visitorsCount: number;
  vehiclesCount: number;
  logsCount: number;
  patrolsCount: number;
}

export default function GridStatistique({ visitorsCount, vehiclesCount, logsCount, patrolsCount }: GridStatistiqueProps) {
  const stats = [
    ['Passages visiteurs', visitorsCount], 
    ['Véhicules', vehiclesCount], 
    ['Événements', logsCount], 
    ['Rondes', patrolsCount]
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(([label, value]) => (
        <div key={label} className="rounded-lg border bg-card p-5">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}