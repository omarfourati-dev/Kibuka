import { useEffect, useState } from "react";
import { useAuthStore } from "@omarsapp/shared-stores";

/**
 * Hat die angemeldete Familie ein aktives Abo?
 * false = Gast oder kein Abo, null = angemeldet, Status lädt noch.
 * Fehler zählen als "kein Abo" — Werbung und Abo-Band sind harmlos,
 * ein gesperrtes Buch wäre es nicht (das prüft ohnehin der Server).
 */
export function useIsSubscriber(): boolean | null {
  const accessToken = useAuthStore((s) => s.accessToken);
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

  return isSubscriber;
}
