import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@omarsapp/shared-types";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Kurzlebiges JWT (15 min) — bewusst NUR im Speicher, nie persistiert. */
  accessToken: string | null;
  setUser: (user: AuthUser) => void;
  setToken: (token: string) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      setUser: (user) => set({ user, isAuthenticated: true }),
      setToken: (token) => set({ accessToken: token }),
      clearUser: () =>
        set({ user: null, isAuthenticated: false, accessToken: null }),
    }),
    {
      name: "auth-storage",
      // accessToken absichtlich nicht persistieren (Security: Memory-only)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

/** Authorization-Header für fetch-Aufrufe — leer, wenn nicht eingeloggt. */
export function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
