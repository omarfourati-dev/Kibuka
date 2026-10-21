import { Redirect, Route } from "react-router-dom";
import type { RouteProps } from "react-router-dom";
import { useAuthStore } from "@omarsapp/shared-stores";

export function ProtectedRoute({ children, ...rest }: RouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return (
    <Route
      {...rest}
      render={() =>
        isAuthenticated ? <>{children}</> : <Redirect to="/login" />
      }
    />
  );
}
