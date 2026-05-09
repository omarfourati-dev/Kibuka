import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@omarsapp/shared-stores";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
