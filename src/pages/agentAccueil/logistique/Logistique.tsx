import { useState } from 'react';
import FormChargement from './FormChargement';
import FormDechargement from './FormDechargement';
import GestionPlombs from './GestionPlombs';
import ListLogistique from './ListLogistique';
import ModuleAnomalies from './ModuleAnomalies';
import StockExterieur from './StockExterieur';

export default function Logistique() {
    const [activeSubTab, setActiveSubTab] = useState('chargement');
    const [refreshKey, setRefreshKey] = useState(0);

    const handleRefresh = () => setRefreshKey(prev => prev + 1);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <div>
                <h2 className="text-xl font-bold">Flux Logistiques, Registres & Stock Extérieur</h2>
                <p className="text-sm text-muted-foreground">Gestion complète des chargements, déchargements, plombs, anomalies et inventaire stock agence.</p>
            </div>

            <div className="flex flex-wrap gap-2 border-b pb-3">
                {[
                    ['chargement', 'Chargement'], 
                    ['dechargement', 'Déchargement'], 
                    ['plombs', 'Gestion Plombs'], 
                    ['anomalies', 'Module Anomalies'],
                    ['stock', 'Stock Extérieur (Agence)']
                ].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setActiveSubTab(key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            activeSubTab === key ? 'bg-primary text-primary-foreground shadow' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
                <div className="border rounded-lg p-4 bg-card shadow-sm">
                    <h3 className="font-semibold text-sm mb-3">
                        {activeSubTab === 'chargement' ? 'Nouveau Chargement' :
                         activeSubTab === 'dechargement' ? 'Nouveau Déchargement' :
                         activeSubTab === 'plombs' ? 'Suivi & Contrôle Plombs' : 
                         activeSubTab === 'anomalies' ? 'Déclarer une Anomalie' : 
                         'Inventaire Stock Extérieur (Agence)'}
                    </h3>
                    {activeSubTab === 'chargement' && <FormChargement onRefresh={handleRefresh} />}
                    {activeSubTab === 'dechargement' && <FormDechargement onRefresh={handleRefresh} />}
                    {activeSubTab === 'plombs' && <GestionPlombs />}
                    {activeSubTab === 'anomalies' && <ModuleAnomalies onRefresh={handleRefresh} />}
                    {activeSubTab === 'stock' && <StockExterieur onRefresh={handleRefresh} />}
                </div>

                <div className="border rounded-lg p-4 bg-card shadow-sm">
                    <h3 className="font-semibold text-sm mb-3">Registre Général des Flux & Stocks</h3>
                    <ListLogistique refreshKey={refreshKey} />
                </div>
            </div>
        </div>
    );
}