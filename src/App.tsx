import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/layout/SiteLayout'
import { DefaultSitePage } from './components/layout/SiteLayout/DefaultSitePage'
import { AdminHome, AdminLayout, UsersPage as AdminUsersPage, UserSettingsPage } from './features/access'
import { AuthProvider, LoginPage, RequireAuth, RequirePermission } from './features/auth'
import { DirectoryPage, postsConfig } from './features/directories'
import { PostSettingsPage } from './features/posts'
import { PlanningPage } from './features/planning'
import { SheetBuilderPage, SheetEntryPage, SheetsPage } from './features/sheets'
import { MinutesEditorPage, MinutesListPage } from './features/minutes'
import { ProjectSettingsPage } from './features/projectSettings'
import { SitesPage } from './features/sites'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminHome />} />
              <Route path="users" element={<RequirePermission permission="users.view"><AdminUsersPage /></RequirePermission>} />
              <Route path="users/:userId" element={<RequirePermission permission="users.view"><UserSettingsPage /></RequirePermission>} />
              <Route path="planning" element={<RequirePermission permission="planning.view"><PlanningPage /></RequirePermission>} />
              <Route path="roles" element={<Navigate to="/admin/users" replace />} />
            </Route>
            <Route path="/sites/:siteId" element={<SiteLayout />}>
              <Route index element={<DefaultSitePage />} />
              <Route path="postes" element={<RequirePermission permission="administration.view"><DirectoryPage key="posts" config={postsConfig} /></RequirePermission>} />
              <Route path="postes/:postId" element={<RequirePermission permission="administration.view"><PostSettingsPage /></RequirePermission>} />
              <Route path="postes/:postId/feuilles/:sheetId" element={<RequirePermission permission="administration.view"><SheetBuilderPage /></RequirePermission>} />
              <Route path="feuilles" element={<RequirePermission permission="sheets.view"><SheetsPage /></RequirePermission>} />
              <Route path="feuilles/:sheetId" element={<RequirePermission permission="sheets.view"><SheetEntryPage /></RequirePermission>} />
              <Route path="comptes-rendus" element={<RequirePermission permission="minutes.view"><MinutesListPage /></RequirePermission>} />
              <Route path="comptes-rendus/:minutesId" element={<RequirePermission permission="minutes.view"><MinutesEditorPage /></RequirePermission>} />
              <Route path="parametres" element={<ProjectSettingsPage />} />
              <Route path="parametres/utilisateurs/:userId" element={<RequirePermission permission="users.view"><UserSettingsPage /></RequirePermission>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/sites" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
