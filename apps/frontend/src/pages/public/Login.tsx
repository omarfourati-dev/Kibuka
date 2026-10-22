import { useEffect, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@omarsapp/shared-stores";
import { apiClient } from "@omarsapp/shared-api";
import type { AuthUser } from "@omarsapp/shared-types";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

type Mode = "login" | "register";

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

/** Nur interne Pfade zulassen — kein Open Redirect auf fremde Hosts. */
function safeRedirect(search: string): string {
  const target = new URLSearchParams(search).get("redirect") ?? "";
  return target.startsWith("/") && !target.startsWith("//") ? target : "/";
}

export default function Login() {
  const history = useHistory();
  const location = useLocation();
  const redirectTo = safeRedirect(location.search);
  const { isAuthenticated, setUser, setToken } = useAuthStore();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.title =
      mode === "login" ? "Anmelden — Kibuka" : "Registrieren — Kibuka";
  }, [mode]);

  useEffect(() => {
    if (isAuthenticated) {
      history.replace(redirectTo);
    }
  }, [isAuthenticated, history, redirectTo]);

  const mutation = useMutation({
    mutationFn: (payload: {
      email: string;
      password: string;
      name?: string;
      mode: "login" | "register";
    }) =>
      apiClient.post<AuthResponse>(
        payload.mode === "login" ? "/auth/login" : "/auth/register",
        {
          email: payload.email,
          password: payload.password,
          ...(payload.name ? { name: payload.name } : {}),
        },
      ),
    onSuccess: (data) => {
      setUser(data.user);
      setToken(data.access_token);
      history.replace(redirectTo);
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Authentication failed. Please try again.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutation.mutate({
      email,
      password,
      ...(mode === "register" ? { name } : {}),
      mode,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="text-2xl font-bold text-slate-900 dark:text-white"
          >
            Kibuka
          </Link>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
          {/* Google OAuth bewusst entfernt: /auth/google liefert 501,
              der Button wäre ein toter Link. Wieder einbauen, sobald
              OAuth real verdrahtet ist. */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <Input
                label="Full name"
                type="text"
                placeholder="Omar Fourati"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            )}
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              error={error || undefined}
            />

            <Button
              type="submit"
              className="w-full"
              loading={mutation.isPending}
            >
              {mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              type="button"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                mutation.reset();
              }}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          &copy; {new Date().getFullYear()} Kibuka
        </p>
      </div>
    </div>
  );
}
