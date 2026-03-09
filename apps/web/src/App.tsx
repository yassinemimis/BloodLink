import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import { Role } from './types';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BloodRequestsPage from './pages/BloodRequestsPage';
import NewRequestPage from './pages/NewRequestPage';
import RequestDetailPage from './pages/RequestDetailPage';
import DonorsPage from './pages/DonorsPage';
import CentersPage from './pages/CentersPage';
import MapPage from './pages/MapPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import VerificationPage from './pages/VerificationPage';
import CampaignsPage from './pages/CampaignsPage';
import ChatPage from './pages/ChatPage';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

// ✅ Route protégée — utilisateur connecté
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ✅ Route protégée par rôle — redirige si rôle non autorisé
function RoleRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: Role[];
}) {
  const { user } = useAuthStore();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Routes protégées */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="requests" element={<BloodRequestsPage />} />
            <Route path="requests/:id" element={<RequestDetailPage />} />

            {/* ✅ DONOR ممنوع من Nouvelle demande */}
            <Route
              path="requests/new"
              element={
                <RoleRoute allowedRoles={[Role.ADMIN, Role.DOCTOR, Role.PATIENT]}>
                  <NewRequestPage />
                </RoleRoute>
              }
            />

            <Route path="donors" element={<DonorsPage />} />
            <Route path="centers" element={<CentersPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="map" element={<MapPage />} />
            <Route
              path="verification"
              element={
                <RoleRoute allowedRoles={[Role.ADMIN]}>
                  <VerificationPage />
                </RoleRoute>
              }
            />

            <Route path="chat" element={<ChatPage />} />
            <Route path="chat/:donationId" element={<ChatPage />} />
            
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />

           
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#1f2937', color: '#fff' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;