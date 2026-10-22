import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUIStore } from "@omarsapp/shared-stores";
import { applyDocumentLanguage, landingPageLanguage } from "../lib/locale";

/**
 * Hält die App-Sprache zusammen: /ar, /fr, /en wählen sie, der UI-Store
 * merkt sie sich (auch über Reloads), <html lang/dir> und i18n folgen ihr.
 * Layout-Effekte, damit beim Sprachwechsel nichts in der alten Sprache
 * aufblitzt.
 */
export function DocumentLanguage() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  useLayoutEffect(() => {
    const fromUrl = landingPageLanguage(pathname);
    if (fromUrl) setLanguage(fromUrl);
  }, [pathname, setLanguage]);

  useLayoutEffect(() => {
    applyDocumentLanguage(language);
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [language, i18n]);

  return null;
}
