import { IonContent, IonPage } from "@ionic/react";
import { useHistory } from "react-router-dom";
import { useAuthStore } from "@omarsapp/shared-stores";

const ROLE_LABELS: Record<string, string> = {
  owner: "Administrator",
  admin: "Administrator",
  member: "Mitglied",
  viewer: "Gast",
};

export default function ProfilePage() {
  const history = useHistory();
  const { user, isAuthenticated, clearUser } = useAuthStore();

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

              <button
                type="button"
                onClick={() => clearUser()}
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
