import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { ScrollToTop } from './components/ScrollToTop'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { TournamentsPage } from './pages/TournamentsPage'
import { CreateTournamentPage } from './pages/CreateTournamentPage'
import { TournamentDetailPage } from './pages/TournamentDetailPage'
import { JoinTournamentPage } from './pages/JoinTournamentPage'
import { ProfilePage } from './pages/ProfilePage'
import { LegalNotice } from './pages/legal/LegalNotice'
import { PrivacyPolicy } from './pages/legal/PrivacyPolicy'
import { TermsOfService } from './pages/legal/TermsOfService'
import { ContactPage } from './pages/ContactPage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ErrorBoundary>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/tournaments" element={<TournamentsPage />} />
                <Route path="/tournaments/new" element={<CreateTournamentPage />} />
                <Route path="/tournaments/join" element={<JoinTournamentPage />} />
                <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
                <Route path="/legal/mentions-legales" element={<LegalNotice />} />
                <Route path="/legal/politique-confidentialite" element={<PrivacyPolicy />} />
                <Route path="/legal/cgu" element={<TermsOfService />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
