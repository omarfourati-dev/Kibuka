import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";

const LandingPage = lazy(() => import("./pages/public/Landing"));
const LoginPage = lazy(() => import("./pages/public/Login"));
const PricingPage = lazy(() => import("./pages/public/Pricing"));
const DashboardPage = lazy(() => import("./pages/app/Dashboard"));
const SpacesPage = lazy(() => import("./pages/app/Spaces"));
const SettingsPage = lazy(() => import("./pages/app/Settings"));
const AdminPage = lazy(() => import("./pages/app/Admin"));

const Fallback = () => (
  <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">
    Loading...
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<Fallback />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/pricing" element={<PricingPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              {/* App — layout route */}
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route
                  path="dashboard"
                  element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <DashboardPage />
                    </Suspense>
                  }
                />
                <Route
                  path="spaces"
                  element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <SpacesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <SettingsPage />
                    </Suspense>
                  }
                />
                {/* Admin */}
                <Route
                  path="admin/*"
                  element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <AdminPage />
                    </Suspense>
                  }
                />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
