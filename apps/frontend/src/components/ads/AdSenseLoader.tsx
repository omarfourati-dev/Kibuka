import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { loadAds } from "../../lib/ads";

/** Lädt AdSense, sobald eine Ansicht mit Inhalt geöffnet wird – nicht auf Login/Admin und nie in der App. */
export function AdSenseLoader() {
  const { pathname } = useLocation();
  useEffect(() => {
    loadAds({
      host: window.location.hostname,
      pathname,
      native: Capacitor.isNativePlatform(),
    });
  }, [pathname]);
  return null;
}
