import { useState } from 'react';
import Pieton from './pieton/Pieton';
import Vehicule from './vehicule/Vehicule';

function AgentAccueil() {
    // État pour savoir quel onglet est actif ('pietons' ou 'vehicules')
    const [activeTab, setActiveTab] = useState('pietons');

    return (
        <div className="p-6 space-y-6">
            <header className="flex justify-between items-center border-b pb-4">
                <h1 className="text-2xl font-semibold ">Registre des visiteurs</h1>
                
                {/* Boutons pour basculer entre les vues */}
                <nav className="flex gap-3">
                    <button 
                        onClick={() => setActiveTab('pietons')}
                        className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                            activeTab === 'pietons' 
                                ? 'bg-primary text-primary-foreground shadow' 
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                    >
                        Piétons
                    </button>
                    <button 
                        onClick={() => setActiveTab('vehicules')}
                        className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                            activeTab === 'vehicules' 
                                ? 'bg-primary text-primary-foreground shadow' 
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                    >
                        Véhicules
                    </button>
                </nav>
            </header>

            {/* Affichage dynamique du composant selon l'onglet cliqué */}
            <main>
                {activeTab === 'pietons' && <Pieton />}
                {activeTab === 'vehicules' && <Vehicule />}
            </main>
        </div>
    );
}

export default AgentAccueil;