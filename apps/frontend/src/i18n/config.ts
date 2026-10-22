import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { useUIStore } from "@omarsapp/shared-stores";
import { landingPageLanguage } from "../lib/locale";
import de from "./locales/de.json";
import ar from "./locales/ar.json";
import fr from "./locales/fr.json";
import en from "./locales/en.json";

// Schon der erste Render spricht die richtige Sprache: Landingpage vor
// gespeicherter Wahl (DocumentLanguage hält beides danach synchron)
const initialLanguage =
  landingPageLanguage(window.location.pathname) ??
  useUIStore.getState().language;

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    ar: { translation: ar },
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: "de",
  supportedLngs: ["de", "ar", "fr", "en"],
  interpolation: { escapeValue: false },
});

export default i18n;
