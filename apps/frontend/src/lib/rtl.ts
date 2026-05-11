export type Language = "de" | "ar" | "fr" | "en";

export const isRTL = (lang: Language): boolean => lang === "ar";

export const getDir = (lang: Language): "ltr" | "rtl" =>
  isRTL(lang) ? "rtl" : "ltr";

export const getFontFamily = (lang: Language): string =>
  lang === "ar"
    ? '"Noto Naskh Arabic", "Scheherazade New", serif'
    : '"Nunito", "Comic Sans MS", cursive, sans-serif';

export const getTextAlign = (lang: Language): "left" | "right" =>
  isRTL(lang) ? "right" : "left";
