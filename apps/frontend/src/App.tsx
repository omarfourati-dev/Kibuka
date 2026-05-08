import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppLayout } from "./components/layout/AppLayout";

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
      <Suspense fallback={<Fallback />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pricing" element={<PricingPage />} />

          {/* App — layout route */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="spaces" element={<SpacesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Admin */}
          <Route path="/admin/*" element={<AdminPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
