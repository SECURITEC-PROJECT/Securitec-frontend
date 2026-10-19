import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Administration from '@/pages/administration/Administration';
import AgentAccueil from '@/pages/agentAccueil/AgentAccueil';
import ControleAcces from '@/pages/agentControle/controleAcces/ControleAcces';
import Rondes from '@/pages/agentControle/ronde/Rondes';
import Cameras from '@/pages/agentSupVideo/cameras/Cameras';
import MainCourante from '@/pages/agentSupVideo/mainCourante/MainCourante';
import Authentification from '@/pages/authentification/Authentification';
import CompteRendu from '@/pages/compteRendu/CompteRendu';
import Dashboard from '@/pages/dashboard/Dashboard';
import Documents from '@/pages/documentation/Documentation';
import LayoutPrincipal from '@/pages/layouts/LayoutPrincipal';
import Messagerie from '@/pages/messagerie/Messagerie';
import Passation from '@/pages/passation/Passation';
import PriseDePoste from '@/pages/priseDePoste/PriseDePoste';
import Statistiques from '@/pages/statistique/Statistique';

// 👇 Type du user (adapter selon ce qu'envoie le composant Authentification)
type User = {
  nom: string;
  pin: string;
};

export default function App() {
  // 👇 Typage explicite : User | null
  const [user, setUser] = useState<User | null>(null);

  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        {/* page connexion */}
        <Route
          path="/login"
          element={
            !user ? (
              <Authentification
                onLoginSuccess={(userData) => setUser(userData)}
              />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route path="/auth" element={<Navigate to="/login" replace />} />

        {/* page protégée (LayoutPrincipal) */}
        <Route
          path="/dashboard"
          element={
            user ? (
              <LayoutPrincipal user={user} onLogout={() => setUser(null)} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          {/* Vue d'ensemble (Page principale) */}
          <Route index element={<Dashboard />} />

          {/* Les autres pages du menu */}
          <Route path="statistiques" element={<Statistiques />} />
          <Route path="prise-de-poste" element={<PriseDePoste />} />
          <Route path="passation" element={<Passation />} />
          <Route path="visiteurs" element={<AgentAccueil />} />
          <Route path="controle-acces" element={<ControleAcces />} />
          <Route path="rondes" element={<Rondes />} />
          <Route path="cameras" element={<Cameras />} />
          <Route path="main-courante" element={<MainCourante />} />
          <Route path="comptes-rendus" element={<CompteRendu />} />
          <Route path="messagerie" element={<Messagerie />} />
          <Route path="documents" element={<Documents />} />
          <Route path="administration" element={<Administration />} />
        </Route>

        {/* Redirection par défaut */}
        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}