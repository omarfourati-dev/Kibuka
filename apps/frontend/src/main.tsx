import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { setupIonicReact } from "@ionic/react";

import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

import {
  setAuthTokenProvider,
  setUnauthorizedHandler,
} from "@omarsapp/shared-api";
import { useAuthStore } from "@omarsapp/shared-stores";

import i18n from "./i18n/config";
import App from "./App";
import { restoreSession, startSessionKeepAlive } from "./lib/session";
import "./index.css";

setupIonicReact({ mode: "md" });

// Der zentrale apiClient sendet den Memory-Token als Bearer-Header mit
setAuthTokenProvider(() => useAuthStore.getState().accessToken);
// Sitzung abgelaufen → Zustand zentral aufräumen (verhindert "angemeldet,
// aber alles schlägt fehl" und die Login-Bounce-Falle)
setUnauthorizedHandler(() => useAuthStore.getState().clearUser());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

// Sitzung VOR dem ersten Render wiederherstellen — sonst laufen Deep-Links
// (z.B. direkt in den Reader) ohne Token in einen 401
void restoreSession().finally(() => {
  startSessionKeepAlive();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
});
