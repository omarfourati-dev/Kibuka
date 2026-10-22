import { getDir, type Language } from "./rtl";

// Sprach-Landingpages (/ar, /fr, /en) — Deutsch bleibt "/" und gilt überall sonst
export const LANGUAGE_HOME_PATHS: Record<Exclude<Language, "de">, string> = {
  ar: "/ar",
  fr: "/fr",
  en: "/en",
};

export function languageForPath(pathname: string): Language {
  const path = "/" + pathname.replace(/^\/+|\/+$/g, "");
  const match = Object.entries(LANGUAGE_HOME_PATHS).find(([, p]) => p === path);
  return match ? (match[0] as Language) : "de";
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
