import { useEffect, useState } from "react";

// Der Schalter ändert sich nur mit einem Deploy — einmal pro Seitenaufruf
// fragen genügt. Fehler → false: lieber kein Abo-Band als eins ins Leere.
let known: boolean | null = null;
let request: Promise<boolean> | null = null;

function fetchBillingEnabled(): Promise<boolean> {
  request ??= fetch("/api/v1/billing/config")
    .then((r) => (r.ok ? (r.json() as Promise<{ enabled?: boolean }>) : null))
    .then((data) => data?.enabled === true)
    .catch(() => false)
    .then((enabled) => {
      known = enabled;
      return enabled;
    });
  return request;
}

/** Kann man gerade kaufen/abonnieren (ENABLE_BILLING)? null = lädt noch. */
export function useBillingEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(known);

  useEffect(() => {
    if (known !== null) return;
    let cancelled = false;
    void fetchBillingEnabled().then((value) => {
      if (!cancelled) setEnabled(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
