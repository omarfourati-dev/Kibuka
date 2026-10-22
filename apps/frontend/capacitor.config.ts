import type { CapacitorConfig } from "@capacitor/cli";

// CAP_SERVER_URL (nur im Mobile-CI gesetzt): die native Hülle lädt die
// Live-Seite. Das Frontend spricht die API über relative Pfade (/api/v1) an —
// aus einem gebündelten webDir heraus gäbe es dafür keinen Server.
const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "app.kibuka",
  appName: "Kibuka",
  webDir: "dist",
  server: {
    androidScheme: "https",
    ...(serverUrl
      ? {
          url: serverUrl,
          // Stripe-Checkout/-Portal in der App behalten, damit die Rückleitung
          // wieder in der App landet statt im System-Browser
          allowNavigation: ["checkout.stripe.com", "billing.stripe.com"],
        }
      : {}),
  },
};

export default config;
