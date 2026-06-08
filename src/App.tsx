import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PriseDePostePage from "./pages/PriseDePostePage";
import JournalPage from "./pages/JournalPage";
import NFCPage from "./pages/NFCPage";
import VisitorsPage from "./pages/VisitorsPage";
import RondesPage from "./pages/RondesPage";
import CamerasPage from "./pages/CamerasPage";
import CRPage from "./pages/CRPage";
import ConsignesPage from "./pages/ConsignesPage";
import ArchivagePage from "./pages/ArchivagePage";
import AuditPage from "./pages/AuditPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
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
      <Route path="/prise-de-poste" element={<Protected><PriseDePostePage /></Protected>} />
      <Route path="/journal" element={<Protected><JournalPage /></Protected>} />
      <Route path="/nfc" element={<Protected><NFCPage /></Protected>} />
      <Route path="/visiteurs" element={<Protected><VisitorsPage /></Protected>} />
      <Route path="/rondes" element={<Protected><RondesPage /></Protected>} />
      <Route path="/cameras" element={<Protected><CamerasPage /></Protected>} />
      <Route path="/cr" element={<Protected><CRPage /></Protected>} />
      <Route path="/consignes" element={<Protected><ConsignesPage /></Protected>} />
      <Route path="/archivage" element={<Protected><ArchivagePage /></Protected>} />
      <Route path="/audit" element={<Protected><AuditPage /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
