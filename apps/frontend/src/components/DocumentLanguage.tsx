import { useLayoutEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUIStore } from "@omarsapp/shared-stores";
import {
  applyDocumentLanguage,
  homePathFor,
  landingPageLanguage,
} from "../lib/locale";

/**
 * Hält die App-Sprache zusammen: /ar, /fr, /en wählen sie, der UI-Store
 * merkt sie sich (auch über Reloads), <html lang/dir> und i18n folgen ihr.
 * "/" führt zur Startseite der gemerkten Sprache (PWA-Start-URL, Login-
 * und 404-Redirects), damit URL, Home-Tab und Sprache zusammenpassen —
 * Besucher ohne gemerkte Sprache (Crawler) bleiben auf "/".
 * Layout-Effekte, damit beim Sprachwechsel nichts in der alten Sprache
 * aufblitzt.
 */
export function DocumentLanguage() {
  const { pathname, search, hash } = useLocation();
  const history = useHistory();
  const { i18n } = useTranslation();
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  useLayoutEffect(() => {
    const fromUrl = landingPageLanguage(pathname);
    if (fromUrl) setLanguage(fromUrl);
  }, [pathname, setLanguage]);

  useLayoutEffect(() => {
    if (pathname === "/" && language !== "de") {
      history.replace({ pathname: homePathFor(language), search, hash });
    }
  }, [pathname, search, hash, language, history]);

  useLayoutEffect(() => {
    applyDocumentLanguage(language);
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [language, i18n]);

  return null;
}
