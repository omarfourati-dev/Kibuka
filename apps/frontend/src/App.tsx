import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const LandingPage = lazy(() => import('./pages/public/Landing'));
const LoginPage = lazy(() => import('./pages/public/Login'));
const DashboardPage = lazy(() => import('./pages/app/Dashboard'));
const AdminPage = lazy(() => import('./pages/app/Admin'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app/*" element={<DashboardPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
