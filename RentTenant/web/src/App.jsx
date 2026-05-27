/**
 * @file App.jsx
 * @description Root component — defines all client-side routes.
 *
 * Route structure:
 *   /login                → Login page (public)
 *   /register             → Register page (public)
 *   /                     → Dashboard (protected)
 *   /buildings            → Buildings list (protected)
 *   /buildings/:id        → Building detail (protected)
 *   /tenants              → Tenants list (protected)
 *   /tenants/:id          → Tenant detail (protected)
 *   /rents                → Rent management (protected)
 *   /reminders            → Reminders & alerts (protected)
 *   /profile              → Owner profile (protected)
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// ── Layout ──────────────────────────────────────────────────────────────────
import MainLayout from './components/layout/MainLayout';

// ── Public Pages ─────────────────────────────────────────────────────────────
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// ── Protected Pages ───────────────────────────────────────────────────────────
import DashboardPage     from './pages/DashboardPage';
import BuildingsPage     from './pages/BuildingsPage';
import BuildingDetailPage from './pages/BuildingDetailPage';
import TenantsPage       from './pages/TenantsPage';
import TenantDetailPage  from './pages/TenantDetailPage';
import RentsPage         from './pages/RentsPage';
import RemindersPage     from './pages/RemindersPage';
import ProfilePage       from './pages/ProfilePage';

/**
 * ProtectedRoute: wraps routes that require authentication.
 * Redirects unauthenticated users to /login.
 * Shows a loading spinner while checking the stored token.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

/**
 * PublicRoute: wraps login/register pages.
 * Redirects already-logged-in users to dashboard.
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

/**
 * App: defines the full route tree.
 * Protected pages are wrapped in MainLayout (sidebar + header).
 */
function App() {
  return (
    <Routes>
      {/* ── Public Routes ── */}
      <Route
        path="/login"
        element={<PublicRoute><LoginPage /></PublicRoute>}
      />
      <Route
        path="/register"
        element={<PublicRoute><RegisterPage /></PublicRoute>}
      />

      {/* ── Protected Routes (inside MainLayout) ── */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard — default landing page */}
        <Route index element={<DashboardPage />} />

        {/* Buildings */}
        <Route path="buildings"     element={<BuildingsPage />} />
        <Route path="buildings/:id" element={<BuildingDetailPage />} />

        {/* Tenants */}
        <Route path="tenants"     element={<TenantsPage />} />
        <Route path="tenants/:id" element={<TenantDetailPage />} />

        {/* Rent Management */}
        <Route path="rents" element={<RentsPage />} />

        {/* Reminders & Alerts */}
        <Route path="reminders" element={<RemindersPage />} />

        {/* Owner Profile */}
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch-all: redirect unknown routes to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
