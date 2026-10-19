import { PageHeader } from "@/components/PageHeader";
import { useDemoTable } from "@/lib/demo-store";
import FormulaireEvenement from "./FormulaireEvenement";
import JournalEvenements from "./JournalEvenements";

export default function MainCourante() {
  const data = useDemoTable("logbook_entries");

  return (
    <div>
      <PageHeader title="Main courante" subtitle="Journal chronologique et horodaté des événements du site" />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <FormulaireEvenement />
        <JournalEvenements data={data} />
      </div>
    </div>
  );
}