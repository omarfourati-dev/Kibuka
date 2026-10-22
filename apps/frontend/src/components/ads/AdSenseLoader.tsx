import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuthStore } from "@omarsapp/shared-stores";
import { adsAllowedOn, loadAds } from "../../lib/ads";

/** Body-Klasse, die bereits eingeblendete Auto-Anzeigen versteckt (index.css). */
export const NO_ADS_CLASS = "kibuka-no-ads";

/**
 * Lädt AdSense, sobald eine Ansicht mit Inhalt geöffnet wird — nicht auf
 * Login/Admin, nie im Reader, nie für Abonnenten und nie in der App.
 */
export function AdSenseLoader() {
  const { pathname } = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  // null = angemeldet, Abo-Status noch unbekannt → erst einmal werbefrei
  const [isSubscriber, setIsSubscriber] = useState<boolean | null>(
    accessToken ? null : false,
  );

  useEffect(() => {
    if (!accessToken) {
      setIsSubscriber(false);
      return;
    }
    let cancelled = false;
    setIsSubscriber(null);
    fetch("/api/v1/billing/subscription/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) =>
        r.ok ? (r.json() as Promise<{ is_active?: boolean }>) : null,
      )
      .then((data) => {
        if (!cancelled) setIsSubscriber(Boolean(data?.is_active));
      })
      .catch(() => {
        if (!cancelled) setIsSubscriber(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

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
