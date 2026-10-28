import { useEffect, useState } from "react";
import { useAuthStore } from "@omarsapp/shared-stores";

// Laufende Abfragen je Token: Startseite (Abo-Band) und Werbung fragen beim
// Laden gleichzeitig — eine Anfrage reicht. Nach der Antwort wird die Abfrage
// verworfen, ein späterer Aufruf fragt neu (Abo kann sich ändern).
const inFlight = new Map<string, Promise<boolean>>();

function fetchIsSubscriber(accessToken: string): Promise<boolean> {
  let request = inFlight.get(accessToken);
  if (!request) {
    request = fetch("/api/v1/billing/subscription/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) =>
        r.ok ? (r.json() as Promise<{ is_active?: boolean }>) : null,
      )
      .then((data) => Boolean(data?.is_active))
      .catch(() => false)
      .finally(() => inFlight.delete(accessToken));
    inFlight.set(accessToken, request);
  }
  return request;
}

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
    void fetchIsSubscriber(accessToken).then((active) => {
      if (!cancelled) setIsSubscriber(active);
    });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return isSubscriber;
}
