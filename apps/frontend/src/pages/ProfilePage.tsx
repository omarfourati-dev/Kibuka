import { useEffect, useState } from "react";
import { IonContent, IonPage } from "@ionic/react";
import { useHistory, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getAuthHeaders,
  useAuthStore,
  useUIStore,
} from "@omarsapp/shared-stores";
import { useAppLanguage } from "../hooks/useAppLanguage";
import { usePageTitle } from "../hooks/usePageTitle";
import { logout } from "../lib/session";
import { LegalFooter } from "../components/legal/LegalFooter";
import { TopNav } from "../components/layout/TopNav";
import { resetAdConsent } from "../lib/ads";
import { formatDate, LANGUAGES, NATIVE_LANGUAGE_NAMES } from "../lib/locale";
import { cn } from "../utils/cn";

interface SubscriptionStatus {
  status: string;
  plan: "monthly" | "yearly" | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  is_active: boolean;
}

// Übersetzungsschlüssel je Abo-Plan bzw. Rolle
const PLAN_KEYS: Record<string, string> = {
  monthly: "profile.planMonthly",
  yearly: "profile.planYearly",
};

const ROLE_KEYS: Record<string, string> = {
  owner: "profile.roleAdmin",
  admin: "profile.roleAdmin",
  member: "profile.roleMember",
  viewer: "profile.roleGuest",
};

export default function ProfilePage() {
  const history = useHistory();
  const location = useLocation();
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const { t } = useTranslation();
  const lang = useAppLanguage();
  const appLanguage = useUIStore((s) => s.language);
  const setAppLanguage = useUIStore((s) => s.setLanguage);
  usePageTitle(t("meta.profile"));
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null,
  );
  const [portalError, setPortalError] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const justSubscribed =
    new URLSearchParams(location.search).get("subscription") === "success";

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setSubscription(null);
      return;
    }
    let cancelled = false;
    fetch("/api/v1/billing/subscription/me", { headers: getAuthHeaders() })
      .then((r) => (r.ok ? (r.json() as Promise<SubscriptionStatus>) : null))
      .then((data) => {
        if (!cancelled) setSubscription(data);
      })
      .catch(() => {
        if (!cancelled) setSubscription(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, accessToken]);

  const openPortal = async () => {
    setPortalError(null);
    setOpeningPortal(true);
    try {
      const res = await fetch("/api/v1/billing/portal", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (!res.ok || !data.url) throw new Error("portal");
      window.location.assign(data.url);
    } catch {
      setPortalError(t("profile.portalError"));
      setOpeningPortal(false);
    }
  };

  return (
    <IonPage>
      <IonContent>
        <TopNav />
        <div className="flex flex-col gap-6 p-6 max-w-xl mx-auto">
          <h1
            className="text-2xl font-extrabold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {t("profile.title")}
          </h1>

          {isAuthenticated && user ? (
            <div
              className="flex flex-col gap-4 rounded-2xl p-6"
              style={{ backgroundColor: "var(--color-surface-raised)" }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white select-none"
                  style={{ backgroundColor: "var(--color-primary)" }}
                  aria-hidden="true"
                >
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-lg font-bold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {user.name}
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {user.email}
                  </span>
                  <span
                    className="text-xs mt-1"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {ROLE_KEYS[user.role] ? t(ROLE_KEYS[user.role]) : user.role}
                  </span>
                </div>
              </div>

              {justSubscribed && (
                <div
                  role="status"
                  className="rounded-xl px-4 py-3 font-semibold"
                  style={{
                    backgroundColor: "rgba(78, 205, 196, 0.15)",
                    border: "2px solid #4ECDC4",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {t("profile.welcome")}
                </div>
              )}

              {/* Abo */}
              <div
                className="flex flex-col gap-2 rounded-xl p-4"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                {subscription?.is_active ? (
                  <>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {t(
                        subscription.status === "trialing"
                          ? "profile.trialing"
                          : "profile.active",
                        {
                          plan: t(
                            PLAN_KEYS[subscription.plan ?? ""] ??
                              "profile.planFallback",
                          ),
                        },
                      )}
                    </span>
                    {subscription.current_period_end && (
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {t(
                          subscription.cancel_at_period_end
                            ? "profile.canceledUntil"
                            : "profile.renewsOn",
                          {
                            date: formatDate(
                              subscription.current_period_end,
                              lang,
                            ),
                          },
                        )}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void openPortal()}
                      disabled={openingPortal}
                      className="self-start mt-1 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all duration-200 hover:opacity-80 disabled:opacity-60"
                      style={{
                        borderColor: "var(--color-primary)",
                        color: "var(--color-primary-text)",
                      }}
                    >
                      {openingPortal
                        ? t("profile.opening")
                        : t("profile.manage")}
                    </button>
                    {portalError && (
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-error-text)" }}
                      >
                        {portalError}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {t("profile.noSubscription")}
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {t("profile.noSubscriptionText")}
                    </span>
                    <button
                      type="button"
                      onClick={() => history.push("/pricing")}
                      className="self-start mt-1 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all duration-200 hover:opacity-80"
                      style={{
                        borderColor: "var(--color-primary)",
                        color: "var(--color-primary-text)",
                      }}
                    >
                      {t("profile.viewPlans")}
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => void logout()}
                className="self-start px-5 py-2.5 rounded-xl font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {t("profile.logout")}
              </button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-4 rounded-2xl p-8 text-center"
              style={{ backgroundColor: "var(--color-surface-raised)" }}
            >
              <span className="text-5xl select-none" aria-hidden="true">
                👋
              </span>
              <p
                className="font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {t("profile.notLoggedIn")}
              </p>
              <p
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t("profile.notLoggedInText")}
              </p>
              <button
                type="button"
                onClick={() => history.push("/login?redirect=/profile")}
                className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {t("profile.login")}
              </button>
            </div>
          )}

          {/* Einziger Weg zurück nach Deutsch: "/" behält die gewählte Sprache */}
          <section
            className="flex flex-col gap-3 rounded-2xl p-6"
            style={{ backgroundColor: "var(--color-surface-raised)" }}
          >
            <h2
              id="app-language-heading"
              className="font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t("profile.appLanguage")}
            </h2>
            <div
              role="group"
              aria-labelledby="app-language-heading"
              className="flex flex-wrap gap-2"
            >
              {LANGUAGES.map((l) => {
                const isSelected = l === appLanguage;
                return (
                  <button
                    key={l}
                    type="button"
                    lang={l}
                    aria-pressed={isSelected}
                    onClick={() => setAppLanguage(l)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                      isSelected
                        ? "text-white border-transparent bg-[var(--color-primary)]"
                        : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:opacity-80",
                    )}
                  >
                    {NATIVE_LANGUAGE_NAMES[l]}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Impressum, Datenschutz und Kündigen stehen in der LegalFooter */}
          <div
            className="flex justify-center text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <button
              type="button"
              onClick={() => resetAdConsent()}
              className="hover:underline"
            >
              {t("profile.privacySettings")}
            </button>
          </div>
        </div>
        <LegalFooter />
      </IonContent>
    </IonPage>
  );
}
