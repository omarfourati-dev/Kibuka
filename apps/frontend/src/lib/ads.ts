// Google AdSense (Auto-Anzeigen plus Googles eigenes Einwilligungsfenster), nur auf der Live-Website im Browser:
// nie lokal, in Tests oder in der Android/iOS-App (AdSense ist in Apps nicht erlaubt, dort wäre AdMob nötig).
// Kibuka richtet sich an Kinder: es werden nur nicht-personalisierte Anzeigen angefordert.
// Datenschutzhinweis: omarfourati.de/de/datenschutz §6.
export const ADSENSE_CLIENT = "ca-pub-4072840905222883";
export const ADSENSE_HOST = "kibuka.omarfourati.de";
export const PRIVACY_URL = "https://omarfourati.de/de/datenschutz";
export const IMPRINT_URL = "https://omarfourati.de/de/impressum";
const SCRIPT_ID = "adsbygoogle-loader";

interface AdsQueue extends Array<unknown> {
  requestNonPersonalizedAds?: number;
}

/** Login und der geschützte Bereich (/app) haben keine Inhalte für Werbung; alle anderen Ansichten schon. */
export function adsAllowedOn(pathname: string): boolean {
  return (
    pathname !== "/login" &&
    pathname !== "/app" &&
    !pathname.startsWith("/app/")
  );
}

/** Fügt den AdSense-Lader einmal ein; gibt zurück, ob er eingefügt wurde. */
export function loadAds(
  opts: { host: string; pathname: string; native: boolean },
  doc: Document = document,
  win: Window & { adsbygoogle?: AdsQueue } = window,
): boolean {
  if (opts.native || opts.host !== ADSENSE_HOST || !adsAllowedOn(opts.pathname))
    return false;
  if (doc.getElementById(SCRIPT_ID)) return false;
  const queue = (win.adsbygoogle ??= [] as AdsQueue);
  queue.requestNonPersonalizedAds = 1; // Zielgruppe Kinder: nie personalisierte Werbung
  const script = doc.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  doc.head.appendChild(script);
  return true;
}

/** Cookies, in denen Googles Einwilligungsfenster die Entscheidung speichert. */
export const CONSENT_COOKIES = ["FCCDCF", "FCNEC"];

/**
 * „Datenschutzeinstellungen“: vergisst die gespeicherte Entscheidung (auf diesem Host und allen Elterndomains) und
 * lädt neu, damit Googles Einwilligungsfenster wie beim ersten Besuch erscheint.
 */
export function resetAdConsent(
  doc: { cookie: string } = document,
  loc: { hostname: string; reload(): void } = window.location,
): void {
  const parts = loc.hostname.split(".");
  const domains = [""];
  for (let k = 0; k < parts.length - 1; k++)
    domains.push(`; domain=.${parts.slice(k).join(".")}`);
  for (const name of CONSENT_COOKIES)
    for (const d of domains) doc.cookie = `${name}=; Max-Age=0; path=/${d}`;
  loc.reload();
}
