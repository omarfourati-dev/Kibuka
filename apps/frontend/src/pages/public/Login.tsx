import { useEffect, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@omarsapp/shared-stores";
import { apiClient } from "@omarsapp/shared-api";
import type { AuthUser } from "@omarsapp/shared-types";
import { SunMark } from "../../components/layout/TopNav";
import { useAppLanguage } from "../../hooks/useAppLanguage";
import { usePageTitle } from "../../hooks/usePageTitle";
import { homePathFor, pickTitle } from "../../lib/locale";

type Mode = "login" | "register";

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

interface BookContext {
  title: string;
  cover: string | null;
}

/** Nur interne Pfade zulassen — kein Open Redirect auf fremde Hosts. */
function safeRedirect(search: string): string {
  const target = new URLSearchParams(search).get("redirect") ?? "";
  return target.startsWith("/") && !target.startsWith("//") ? target : "/";
}

const READER_PATH = /^\/books\/([^/?#]+)\/read/;

const FIELD =
  "w-full h-[52px] px-4 rounded-2xl border-[1.5px] text-[17px] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-text)] placeholder:text-[var(--color-text-muted)]";
const FIELD_STYLE = {
  borderColor: "var(--color-border)",
  backgroundColor: "var(--color-surface)",
  color: "var(--color-text-primary)",
};

export default function Login() {
  const history = useHistory();
  const location = useLocation();
  const redirectTo = safeRedirect(location.search);
  const readerBookId = READER_PATH.exec(redirectTo)?.[1] ?? null;
  const { isAuthenticated, accessToken, setUser, setToken } = useAuthStore();

  // Kommt jemand vom Lesen-Knopf, ist er meist neu: Registrierung zuerst
  const [mode, setMode] = useState<Mode>(readerBookId ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [book, setBook] = useState<BookContext | null>(null);
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

  useEffect(() => {
    if (!readerBookId) return;
    let cancelled = false;
    fetch(`/api/v1/books/${encodeURIComponent(readerBookId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            titles?: Record<string, string>;
            cover_image_url?: string | null;
          } | null,
        ) => {
          if (!cancelled && data?.titles) {
            setBook({
              title: pickTitle(data.titles, lang),
              cover: data.cover_image_url ?? null,
            });
          }
        },
      )
      .catch(() => {
        // Nur Kontext — das Formular funktioniert auch ohne
      });
    return () => {
      cancelled = true;
    };
  }, [readerBookId, lang]);

  const mutation = useMutation({
    mutationFn: (payload: {
      email: string;
      password: string;
      name?: string;
      mode: Mode;
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
      setError(err instanceof Error ? err.message : t("login.failed"));
    },
  });

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    mutation.reset();
  };

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

  const submitLabel = readerBookId
    ? mode === "login"
      ? t("login.signInAndRead")
      : t("login.registerAndRead")
    : mode === "login"
      ? t("login.signIn")
      : t("login.register");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: "var(--color-background)",
        color: "var(--color-text-primary)",
      }}
    >
      <header className="px-5 pt-4">
        <Link
          to={homePathFor(lang)}
          className="inline-flex items-center gap-2 text-[24px] font-extrabold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-text)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <SunMark />
          <span lang="de">Kibuka</span>
        </Link>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-6 py-8 flex flex-col gap-6">
        {book && (
          <div className="flex items-center gap-3.5">
            {book.cover && (
              <img
                src={book.cover}
                alt=""
                className="w-[72px] h-[72px] object-cover shrink-0"
                style={{
                  borderRadius: "var(--radius-book)",
                  boxShadow: "var(--shadow-md)",
                }}
              />
            )}
            <span
              className="text-[20px] font-bold leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {book.title}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h1 className="text-[30px] font-extrabold leading-tight">
            {readerBookId
              ? t("login.familyTitle")
              : mode === "login"
                ? t("login.welcomeBack")
                : t("login.createAccount")}
          </h1>
          {readerBookId && (
            <p
              className="m-0 text-base leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t("login.familyText")}
            </p>
          )}
        </div>

        <div
          role="tablist"
          aria-label={t("login.tabsLabel")}
          className="grid grid-cols-2 gap-1 p-1 rounded-2xl"
          style={{ backgroundColor: "var(--color-surface-raised)" }}
        >
          {(["register", "login"] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchMode(m)}
                className="h-11 rounded-xl font-bold text-base transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-text)]"
                style={{
                  backgroundColor: active
                    ? "var(--color-surface)"
                    : "transparent",
                  color: active
                    ? "var(--color-text-primary)"
                    : "var(--color-text-secondary)",
                  boxShadow: active ? "var(--shadow-sm)" : undefined,
                }}
              >
                {m === "register" ? t("login.tabNew") : t("login.tabSignIn")}
              </button>
            );
          })}
        </div>

        {/* Google OAuth bewusst entfernt: /auth/google liefert 501 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="font-bold text-[15px]">
                {t("login.name")}
              </label>
              <input
                id="name"
                type="text"
                placeholder={t("login.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className={FIELD}
                style={FIELD_STYLE}
              />
            </div>
          )}
          {/* E-Mail und Passwort bleiben auch auf Arabisch links-nach-rechts */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-bold text-[15px]">
              {t("login.email")}
            </label>
            <input
              id="email"
              dir="ltr"
              type="email"
              placeholder={t("login.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={FIELD}
              style={FIELD_STYLE}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="font-bold text-[15px]">
              {t("login.password")}
            </label>
            <input
              id="password"
              dir="ltr"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className={FIELD}
              style={FIELD_STYLE}
            />
          </div>

          {error && (
            <p
              id="login-error"
              role="alert"
              className="m-0 text-[15px] font-medium"
              style={{ color: "var(--color-error-text)" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="mt-1 h-14 rounded-2xl font-bold text-lg transition-colors duration-200 hover:bg-[var(--color-primary-dark)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-text)]"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-on-primary)",
            }}
          >
            {submitLabel}
          </button>
        </form>

        {mode === "register" && (
          <p
            className="m-0 text-[13px] leading-relaxed text-center"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t("login.noPayment")}
          </p>
        )}
      </main>
    </div>
  );
}
