import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useIsSubscriber } from "../../hooks/useIsSubscriber";
import { adsAllowedOn, loadAds } from "../../lib/ads";

/** Body-Klasse, die bereits eingeblendete Auto-Anzeigen versteckt (index.css). */
export const NO_ADS_CLASS = "kibuka-no-ads";

/**
 * Lädt AdSense, sobald eine Ansicht mit Inhalt geöffnet wird — nicht auf
 * Login/Admin, nie im Reader, nie für Abonnenten und nie in der App.
 */
export function AdSenseLoader() {
  const { pathname } = useLocation();
  // null = angemeldet, Abo-Status noch unbekannt → erst einmal werbefrei
  const isSubscriber = useIsSubscriber();

  const adFree = isSubscriber !== false || !adsAllowedOn(pathname);

  useEffect(() => {
    document.body.classList.toggle(NO_ADS_CLASS, adFree);
  }, [adFree]);

  useEffect(() => {
    if (adFree) return;
    loadAds({
      host: window.location.hostname,
      pathname,
      native: Capacitor.isNativePlatform(),
    });
  }, [adFree, pathname]);

  return null;
}
