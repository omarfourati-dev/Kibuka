import { getDir, type Language } from "./rtl";

export const LANGUAGES: readonly Language[] = ["de", "ar", "fr", "en"];

// Name jeder Sprache in ihrer eigenen Sprache (Sprachumschalter)
export const NATIVE_LANGUAGE_NAMES: Record<Language, string> = {
  de: "Deutsch",
  ar: "العربية",
  fr: "Français",
  en: "English",
};

// Sprach-Landingpages (/ar, /fr, /en) — Deutsch ist "/"
export const LANGUAGE_HOME_PATHS: Record<Exclude<Language, "de">, string> = {
  ar: "/ar",
  fr: "/fr",
  en: "/en",
};

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}

/**
 * Sprache, die eine Landingpage vorgibt — null für alle anderen Seiten.
 * "/" gibt bewusst nichts vor: dorthin führen auch Login-Redirects und
 * 404s, und die sollen die gewählte Sprache nicht zurücksetzen.
 */
export function landingPageLanguage(pathname: string): Language | null {
  const path = "/" + pathname.replace(/^\/+|\/+$/g, "");
  const match = Object.entries(LANGUAGE_HOME_PATHS).find(([, p]) => p === path);
  return match ? (match[0] as Language) : null;
}

/** Startseite einer Sprache (Home-Tab, Logo-Links). */
export function homePathFor(lang: Language): string {
  return lang === "de" ? "/" : LANGUAGE_HOME_PATHS[lang];
}

export function applyDocumentLanguage(lang: Language): void {
  document.documentElement.lang = lang;
  document.documentElement.dir = getDir(lang);
}

export function pickTitle(
  titles: Partial<Record<string, string>>,
  lang: Language,
): string {
  return titles[lang] || titles.de || Object.values(titles).find(Boolean) || "";
}

/** Euro-Preis, wie man ihn in der jeweiligen Sprache schreibt (ganze Beträge ohne Cent). */
export function formatPrice(amount: number, lang: Language): string {
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  switch (lang) {
    case "ar":
      return `${value} يورو`;
    case "en":
      return `€${value}`;
    default:
      // Deutsch und Französisch: Betrag vor dem Zeichen (DIN 5008: "2,99 €")
      return `${value.replace(".", ",")} €`;
  }
}

// Arabisch mit westlichen Ziffern — wie die Zahlen im übrigen Text
export const DATE_LOCALES: Record<Language, string> = {
  de: "de-DE",
  ar: "ar-u-nu-latn",
  fr: "fr-FR",
  en: "en-GB",
};

export function formatDate(iso: string | null, lang: Language): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(DATE_LOCALES[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const TODAY: Record<Language, [string, string]> = {
  de: ["Heute", "Gestern"],
  ar: ["اليوم", "أمس"],
  fr: ["Aujourd’hui", "Hier"],
  en: ["Today", "Yesterday"],
};

/** Beschriftung im Regal „Diese Woche": Heute, Gestern, sonst Wochentag. */
export function dayLabel(
  iso: string,
  lang: Language,
  now = new Date(),
): string {
  const day = new Date(iso);
  const diff = Math.round((startOfDay(now) - startOfDay(day)) / 86_400_000);
  if (diff <= 0) return TODAY[lang][0];
  if (diff === 1) return TODAY[lang][1];
  return day.toLocaleDateString(DATE_LOCALES[lang], { weekday: "long" });
}

/** Datumszeile über dem Buch des Tages, z. B. "Mittwoch, 28. Oktober". */
export function formatToday(day: Date, lang: Language): string {
  return day.toLocaleDateString(DATE_LOCALES[lang], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
