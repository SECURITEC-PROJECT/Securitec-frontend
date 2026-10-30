import { Toaster } from '@/components/ui/sonner';
import { clearSession, restoreSession, type AuthenticatedUser } from '@/lib/auth-api';
import Administration from '@/pages/administration/Administration';
import AgentAccueil from '@/pages/agentAccueil/AgentAccueil';
import QuestionnaireVisiteur from '@/pages/agentAccueil/QuestionnaireVisiteur';
import DeclarationObjets from '@/pages/agentAccueil/DeclarationObjets';
import Vehicule from '@/pages/agentAccueil/vehicule/Vehicule';
import ControleAcces from '@/pages/agentControle/controleAcces/ControleAcces';
import Alcootest from '@/pages/agentControle/controleAcces/Alcootest';
import Rondes from '@/pages/agentControle/ronde/Rondes';
import PointsVigilance from '@/pages/agentControle/ronde/PointsVigilance';
import Cameras from '@/pages/agentSupVideo/cameras/Cameras';
import MainCourante from '@/pages/agentSupVideo/mainCourante/MainCourante';
import Courrier from '@/pages/courrier/Courrier';
import Authentification from '@/pages/authentification/Authentification';
import CompteRendu from '@/pages/compteRendu/CompteRendu';
import Dashboard from '@/pages/dashboard/Dashboard';
import Documents from '@/pages/documentation/Documentation';
import Chauffeurs from '@/pages/chauffeurs/Chauffeurs';
import Employes from '@/pages/employes/Employes';
import LayoutPrincipal from '@/pages/layouts/LayoutPrincipal';
// import Messagerie from '@/pages/messagerie/Messagerie';
import Passation from '@/pages/passation/Passation';
import Consignes from '@/pages/consigne/Consignes';
import MaterielsSousTraitant from '@/pages/materielsSousTraitant/MaterielsSousTraitant';
import MaterielsStar from '@/pages/materielsStar/MaterielsStar';
import FluxLogistique from '@/pages/fluxLogistique/FluxLogistique';
import ChargementsStarParticuliers from '@/pages/fluxLogistique/ChargementsStarParticuliers';
import DechetsLevee from '@/pages/fluxLogistique/DechetsLevee';
import OrduresFerrailles from '@/pages/fluxLogistique/OrduresFerrailles';
import MouvementsDeuxRoues from '@/pages/fluxLogistique/MouvementsDeuxRoues';
import DechargementBouteillesVides from '@/pages/fluxLogistique/DechargementBouteillesVides';
import DechargementMatierePremiere from '@/pages/fluxLogistique/DechargementMatierePremiere';
import DepotageFuelGasoil from '@/pages/fluxLogistique/DepotageFuelGasoil';
import CheckListCamion from '@/pages/fluxLogistique/CheckListCamion';
import PriseDePoste from '@/pages/priseDePoste/PriseDePoste';
import Statistiques from '@/pages/statistique/Statistique';
import CarteGrisePermis from '@/pages/carteGrisePermis/CarteGrisePermis';
import PointageAPS from '@/pages/pointageAps/PointageAPS';
import MouvementsAPS from '@/pages/pointageAps/MouvementsAPS';
import Anomalie from '@/pages/anomalie/Anomalie';
import PostesDeGarde from '@/pages/postes/PostesDeGarde';
import PosteOperationnel from '@/pages/postes/PosteOperationnel';
import FichePrestataire from '@/pages/prestataires/FichePrestataire';
import Prestataires from '@/pages/prestataires/Prestataires';
import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { canAccessRoute } from '@/pages/layouts/navigation';

function RoleAccessGuard({ role }: { role: number }) {
  const location = useLocation();
  return canAccessRoute(role, location.pathname)
    ? <Outlet />
    : <Navigate to={role === 2 || role === 5 ? "/dashboard/postes" : "/dashboard"} replace state={{ deniedPath: location.pathname }} />;
}

export default function App() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [sessionChecking, setSessionChecking] = useState(true);

  useEffect(() => {
    let active = true;
    restoreSession()
      .then((restoredUser) => {
        if (active) setUser(restoredUser);
      })
      .finally(() => {
        if (active) setSessionChecking(false);
      });
    return () => { active = false; };
  }, []);

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      {sessionChecking ? <div className="min-h-screen" aria-label="Vérification de la session" /> : <Routes>
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
              <LayoutPrincipal user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route element={<RoleAccessGuard role={user?.role ?? 0} />}>
          {/* Vue d'ensemble (Page principale) */}
          <Route index element={<Dashboard />} />
          <Route path="postes" element={<PostesDeGarde />} />
          <Route path="postes/:posteId" element={<PosteOperationnel />} />
          <Route path="prestataires" element={<Prestataires />} />
          <Route path="prestataires/:providerId" element={<FichePrestataire />} />

          {/* Les autres pages du menu */}
          <Route path="statistiques" element={<Statistiques />} />
          <Route path="prise-de-poste" element={<PriseDePoste />} />
          <Route path="passation" element={<Passation />} />
          <Route path="visiteurs" element={<AgentAccueil canManageSiteBans={Boolean(user && [1, 3].includes(user.role))} />} />
          <Route path="logistique" element={<FluxLogistique />} />
          <Route path="controle-acces" element={<ControleAcces />} />
          <Route path="flux-logistiques" element={<FluxLogistique />} />
          <Route path="rondes" element={<Rondes />} />
          <Route path="points-vigilance" element={<PointsVigilance />} />
          <Route path="cameras" element={<Cameras />} />
          <Route path="main-courante" element={<MainCourante />} />
          <Route path="comptes-rendus" element={<CompteRendu />} />
          {/* <Route path="messagerie" element={<Messagerie />} /> */}
          <Route path="documents" element={<Documents />} />
          <Route path="chauffeurs" element={<Chauffeurs />} />
          <Route path="employes" element={<Employes />} />
          <Route path="administration" element={<Administration />} />
          
          {/* Cahiers */}
          <Route path="mouvements-cles" element={<ControleAcces />} />
          <Route path="carte-grise-permis" element={<CarteGrisePermis />} />
          <Route path="dechets-levee" element={<DechetsLevee />} />
          <Route path="mouvements-aps" element={<MouvementsAPS />} />
          <Route path="dechargements-bennes-vides" element={<DechargementBouteillesVides />} />
          <Route path="dechargements-matiere-premiere" element={<DechargementMatierePremiere />} />
          <Route path="depotage-fuel-gasoil" element={<DepotageFuelGasoil />} />
          <Route path="mouvements-vehicules" element={<Vehicule />} />
          <Route path="pointage-aps" element={<PointageAPS />} />
          <Route path="enregistrements-bon-facture-bon-sortie" element={<FluxLogistique />} />
          <Route path="courrier" element={<Courrier />} />
          <Route path="anomalie" element={<Anomalie/>} />
          <Route path="alcootest" element={<Alcootest />} />
          <Route path="test-alcool" element={<Navigate to="/dashboard/alcootest" replace />} />
          <Route path="consigne" element={<Consignes />} />
          <Route path="chargements-star-particuliers" element={<ChargementsStarParticuliers />} />
          <Route path="materiels-sous-traitant" element={<MaterielsSousTraitant />} />
          <Route path="enregistrements-ordures" element={<OrduresFerrailles kind="ordures" />} />
          <Route path="ordures" element={<FluxLogistique kind="ordures" />} />
          <Route path="ferrailles" element={<OrduresFerrailles kind="ferrailles" />} />
          <Route path="mouvement-velos" element={<MouvementsDeuxRoues kind="velo" />} />
          <Route path="mouvement-moto" element={<MouvementsDeuxRoues kind="moto" />} />
          <Route path="materiels-star" element={<MaterielsStar />} />
          
          {/* Fiches */}
          <Route path="check-list-camion" element={<CheckListCamion />} />
          <Route path="questionnaires-visiteurs" element={<QuestionnaireVisiteur />} />
          <Route path="recoter" element={<FluxLogistique />} />
          <Route path="declaration-objets" element={<DeclarationObjets />} />
          </Route>
        </Route>

        {/* Redirection par défaut */}
        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
      </Routes>}
    </BrowserRouter>
  );
}
