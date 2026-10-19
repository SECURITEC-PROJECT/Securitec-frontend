import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useState } from "react";

import AuditLogTab from "./AuditLogTab";
import EquipmentTab from "./EquipementTab";
import SettingsTab from "./SettingsTab";
import UsersTab from "./Userstab";
import ZonesTab from "./ZonesTab";

export default function Administration() {
  const [tab, setTab] = useState("Utilisateurs");

  const tabs = ['Utilisateurs', 'Zones', 'Équipements', 'Paramètres', 'Journal d’audit'];

  return (
    <div>
      <PageHeader 
        title="Administration" 
        subtitle="Utilisateurs, configuration du site et équipements de démonstration" 
      />

      <div className="mb-6 flex flex-wrap gap-1 border-b pb-3">
        {tabs.map((t) => (
          <Button 
            key={t} 
            variant={tab === t ? 'secondary' : 'ghost'} 
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>

      {tab === 'Utilisateurs' && <UsersTab />}
      {tab === 'Zones' && <ZonesTab />}
      {tab === 'Équipements' && <EquipmentTab />}
      {tab === 'Paramètres' && <SettingsTab />}
      {tab === 'Journal d’audit' && <AuditLogTab />}
    </div>
  );
}