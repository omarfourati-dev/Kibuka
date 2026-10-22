import { useEffect, useState } from "react";
import { IonContent, IonPage } from "@ionic/react";
import { useHistory, useLocation } from "react-router-dom";
import { getAuthHeaders, useAuthStore } from "@omarsapp/shared-stores";
import { logout } from "../lib/session";

interface SubscriptionStatus {
  status: string;
  plan: "monthly" | "yearly" | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  is_active: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  monthly: "Monatsabo",
  yearly: "Jahresabo",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Administrator",
  admin: "Administrator",
  member: "Mitglied",
  viewer: "Gast",
};

export default function ProfilePage() {
  const history = useHistory();
  const location = useLocation();
  const { user, isAuthenticated, accessToken } = useAuthStore();
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
      setPortalError("Die Abo-Verwaltung ist gerade nicht erreichbar.");
      setOpeningPortal(false);
    }
  };

  return (
    <IonPage>
      <IonContent>
        <div className="flex flex-col gap-6 p-6 max-w-xl mx-auto">
          <h1
            className="text-2xl font-extrabold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Profil
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
                    {ROLE_LABELS[user.role] ?? user.role}
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
                  🎉 Willkommen im Abo! Ab sofort kannst du alle Bücher lesen.
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
                      {PLAN_LABELS[subscription.plan ?? ""] ?? "Abo"}{" "}
                      {subscription.status === "trialing"
                        ? "(Testphase)"
                        : "aktiv"}
                    </span>
                    {subscription.current_period_end && (
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {subscription.cancel_at_period_end
                          ? `Gekündigt — läuft bis ${formatDate(subscription.current_period_end)}`
                          : `Verlängert sich am ${formatDate(subscription.current_period_end)}`}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void openPortal()}
                      disabled={openingPortal}
                      className="self-start mt-1 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all duration-200 hover:opacity-80 disabled:opacity-60"
                      style={{
                        borderColor: "var(--color-primary)",
                        color: "var(--color-primary)",
                      }}
                    >
                      {openingPortal
                        ? "Öffne Abo-Verwaltung …"
                        : "Abo verwalten"}
                    </button>
                    {portalError && (
                      <span className="text-sm" style={{ color: "#dc2626" }}>
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
                      Kein Abo
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Mit einem Abo liest du alle Bücher unbegrenzt.
                    </span>
                    <button
                      type="button"
                      onClick={() => history.push("/pricing")}
                      className="self-start mt-1 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all duration-200 hover:opacity-80"
                      style={{
                        borderColor: "var(--color-primary)",
                        color: "var(--color-primary)",
                      }}
                    >
                      Abo ansehen
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
                Abmelden
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
                Du bist nicht angemeldet.
              </p>
              <p
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Melde dich an, um das Tagesbuch gratis zu lesen und gekaufte
                Bücher zu öffnen.
              </p>
              <button
                type="button"
                onClick={() => history.push("/login?redirect=/profile")}
                className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                Anmelden
              </button>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
