import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../hooks/useAuth'
import { DomainProvider } from '../hooks/useDomain'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AppLayout } from './AppLayout'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { TasksPage } from '../pages/TasksPage'
import { HabitsPage } from '../pages/HabitsPage'
import { HistoryPage } from '../pages/HistoryPage'
import { SettingsPage } from '../pages/SettingsPage'

export function App() {
  return (
    <AuthProvider>
      <DomainProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="habits" element={<HabitsPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DomainProvider>
    </AuthProvider>
  )
}
