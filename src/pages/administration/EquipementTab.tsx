import { Panel } from "@/components/PageHeader";

export default function EquipmentTab() {
  const items = [
    '4 caméras · dont 1 en maintenance',
    '8 balises de ronde',
    '2 lecteurs NFC',
    '3 tablettes agents'
  ];

  return (
    <Panel title="Inventaire illustratif">
      <div className="divide-y">
        {items.map((x) => (
          <p className="py-4 text-sm" key={x}>{x}</p>
        ))}
      </div>
    </Panel>
  );
}