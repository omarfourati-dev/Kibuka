import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyDocumentLanguage, languageForPath } from "../lib/locale";

/** Hält <html lang/dir> passend zur aktuellen Route (/ar → ar + rtl). */
export function DocumentLanguage() {
  const { pathname } = useLocation();

  useEffect(() => {
    applyDocumentLanguage(languageForPath(pathname));
  }, [pathname]);

  return null;
}
