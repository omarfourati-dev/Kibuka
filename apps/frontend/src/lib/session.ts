import type { AuthUser } from "@omarsapp/shared-types";
import { useAuthStore } from "@omarsapp/shared-stores";

interface RefreshResponse {
  access_token: string;
  user: AuthUser;
}

/** Access-Token lebt 15 min — kurz vorher erneuern. */
const KEEP_ALIVE_MS = 12 * 60 * 1000;

/**
 * Holt per httpOnly-Refresh-Cookie einen frischen Access-Token.
 * true = angemeldet; false = keine gültige Sitzung (Store wird geleert).
 */
export async function restoreSession(): Promise<boolean> {
  // Nie angemeldet gewesen (persistiertes Flag) → kein Refresh-Cookie zu
  // erwarten: spart einen Request und eine 401 pro anonymem Besuch
  if (!useAuthStore.getState().isAuthenticated) return false;
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      useAuthStore.getState().clearUser();
      return false;
    }
    const data = (await res.json()) as Partial<RefreshResponse>;
    if (!data.access_token || !data.user) {
      useAuthStore.getState().clearUser();
      return false;
    }
    const { setUser, setToken } = useAuthStore.getState();
    setUser(data.user);
    setToken(data.access_token);
    return true;
  } catch {
    // Offline: persistierten Zustand nicht anfassen, nur nicht anmelden
    return false;
  }
}

/** Erneuert den Token periodisch, solange jemand angemeldet ist. */
export function startSessionKeepAlive(): () => void {
  const timer = setInterval(() => {
    if (useAuthStore.getState().isAuthenticated) {
      void restoreSession();
    }
  }, KEEP_ALIVE_MS);
  return () => clearInterval(timer);
}

/** Server-Cookie löschen UND lokalen Zustand leeren — sonst würde der
 *  nächste Refresh einen Ausgeloggten sofort wieder anmelden. */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Lokal trotzdem abmelden
  } finally {
    useAuthStore.getState().clearUser();
  }
}
