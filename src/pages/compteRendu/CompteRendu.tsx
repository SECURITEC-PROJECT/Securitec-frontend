import { PageHeader } from "@/components/PageHeader";
import { useDemoTable } from "@/lib/demo-store";
import FormCompteRendu from "./FormCompteRendu";
import ListCompteRendu from "./ListCompteRendu";

export default function ComptesRendus() {
  const data = useDemoTable("reports");

  return (
    <div>
      <PageHeader title="Comptes rendus" subtitle="Rapports de service et d'incident" />
      <div className="grid gap-6 lg:grid-cols-2">
        <FormCompteRendu />
        <ListCompteRendu data={data} />
      </div>
    </div>
  );
}