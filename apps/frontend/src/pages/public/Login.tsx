import { useEffect, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@omarsapp/shared-stores";
import { apiClient } from "@omarsapp/shared-api";
import type { AuthUser } from "@omarsapp/shared-types";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAppLanguage } from "../../hooks/useAppLanguage";
import { usePageTitle } from "../../hooks/usePageTitle";
import { homePathFor } from "../../lib/locale";

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
  const { isAuthenticated, accessToken, setUser, setToken } = useAuthStore();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const { t } = useTranslation();
  const lang = useAppLanguage();
  usePageTitle(t(mode === "login" ? "meta.login" : "meta.register"));

  useEffect(() => {
    // Nur wegnavigieren, wenn WIRKLICH ein Token existiert. Nach einem
    // Reload ist isAuthenticated aus dem localStorage noch true, der
    // Memory-Token aber weg — sonst Bounce-Falle: das Formular wäre
    // nie wieder erreichbar.
    if (isAuthenticated && accessToken) {
      history.replace(redirectTo);
    }
  }, [isAuthenticated, accessToken, history, redirectTo]);

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
        setError(t("login.failed"));
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
            to={homePathFor(lang)}
            className="text-2xl font-bold text-slate-900 dark:text-white"
          >
            Kibuka
          </Link>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm">
            {mode === "login"
              ? t("login.welcomeBack")
              : t("login.createAccount")}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
          {/* Google OAuth bewusst entfernt: /auth/google liefert 501,
              der Button wäre ein toter Link. Wieder einbauen, sobald
              OAuth real verdrahtet ist. */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <Input
                id="name"
                label={t("login.name")}
                type="text"
                placeholder={t("login.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            )}
            {/* E-Mail und Passwort bleiben auch auf Arabisch links-nach-rechts */}
            <Input
              id="email"
              dir="ltr"
              label={t("login.email")}
              type="email"
              placeholder={t("login.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              id="password"
              dir="ltr"
              label={t("login.password")}
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
              {mode === "login" ? t("login.signIn") : t("login.register")}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
            {mode === "login" ? t("login.noAccount") : t("login.haveAccount")}{" "}
            <button
              type="button"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                mutation.reset();
              }}
            >
              {mode === "login" ? t("login.toRegister") : t("login.toSignIn")}
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
