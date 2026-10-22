import { useTranslation } from "react-i18next";
import { isLanguage } from "../lib/locale";
import type { Language } from "../lib/rtl";

/** Sprache, in der die Oberfläche gerade gerendert wird. */
export function useAppLanguage(): Language {
  const { i18n } = useTranslation();
  return isLanguage(i18n.language) ? i18n.language : "de";
}
