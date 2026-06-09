import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import AppLayout from "./components/layout/AppLayout";
import type { Role } from "./types";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PriseDePostePage from "./pages/PriseDePostePage";
import JournalPage from "./pages/JournalPage";
import NFCPage from "./pages/NFCPage";
import VisitorsPage from "./pages/VisitorsPage";
import EntreesSortiesPage from "./pages/EntreesSorties";
import VehiculesPage from "./pages/VehiculesPage";
import MainCourantePage from "./pages/MainCourantePage";
import PassationsPage from "./pages/PassationsPage";
import RondesPage from "./pages/RondesPage";
import CamerasPage from "./pages/CamerasPage";
import CRPage from "./pages/CRPage";
import ConsignesPage from "./pages/ConsignesPage";
import BadgesPage from "./pages/BadgePage";
import ReglementPage from "./pages/ReglementPage";
import ArchivagePage from "./pages/ArchivagePage";
import AuditPage from "./pages/AuditPage";
import SupervisionPage from "./pages/SupervisionPage";
import MaintenancePage from "./pages/MaintenancePage";

function Protected({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/prise-de-poste" element={<Protected roles={["agent1"]}><PriseDePostePage /></Protected>} />
      <Route path="/journal" element={<Protected><JournalPage /></Protected>} />
      <Route path="/nfc" element={<Protected roles={["agent2", "supervisor"]}><NFCPage /></Protected>} />
      <Route path="/visiteurs" element={<Protected roles={["agent1", "supervisor"]}><VisitorsPage /></Protected>} />
      <Route path="/entrees-sorties" element={<Protected roles={["agent1", "agent2", "supervisor"]}><EntreesSortiesPage /></Protected>} />
      <Route path="/vehicules" element={<Protected roles={["agent1", "agent2", "supervisor"]}><VehiculesPage /></Protected>} />
      <Route path="/main-courante" element={<Protected><MainCourantePage /></Protected>} />
      <Route path="/passations" element={<Protected><PassationsPage /></Protected>} />
      <Route path="/rondes" element={<Protected roles={["agent2", "supervisor"]}><RondesPage /></Protected>} />
      <Route path="/cameras" element={<Protected roles={["agent3", "supervisor"]}><CamerasPage /></Protected>} />
      <Route path="/cr" element={<Protected roles={["agent3", "supervisor"]}><CRPage /></Protected>} />
      <Route path="/consignes" element={<Protected><ConsignesPage /></Protected>} />
      <Route path="/supervision" element={<Protected roles={["supervisor", "agent2", "agent3"]}><SupervisionPage /></Protected>} />
      <Route path="/maintenance" element={<Protected roles={["supervisor", "agent2", "agent3"]}><MaintenancePage /></Protected>} />
      <Route path="/badges" element={<Protected><BadgesPage /></Protected>} />
      <Route path="/reglement" element={<Protected><ReglementPage /></Protected>} />
      <Route path="/archivage" element={<Protected roles={["supervisor"]}><ArchivagePage /></Protected>} />
      <Route path="/audit" element={<Protected roles={["supervisor"]}><AuditPage /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
