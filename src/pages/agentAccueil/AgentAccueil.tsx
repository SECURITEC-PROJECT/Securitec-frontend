import Pieton from './pieton/Pieton';

function AgentAccueil({ canManageSiteBans = false }: { canManageSiteBans?: boolean }) {
    return <Pieton canManageSiteBans={canManageSiteBans} />;
}

export default AgentAccueil;
