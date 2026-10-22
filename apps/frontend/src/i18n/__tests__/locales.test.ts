import { describe, it, expect } from "vitest";
import i18n from "../config";
import de from "../locales/de.json";
import ar from "../locales/ar.json";
import fr from "../locales/fr.json";
import en from "../locales/en.json";

type Tree = { [key: string]: string | Tree };

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** Alle Schlüssel als Pfade; Pluralformen zählen als ein Schlüssel. */
function keys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === "string"
      ? [`${prefix}${k}`.replace(PLURAL_SUFFIX, "")]
      : keys(v, `${prefix}${k}.`),
  );
}

function values(tree: Tree): string[] {
  return Object.values(tree).flatMap((v) =>
    typeof v === "string" ? [v] : values(v),
  );
}

const unique = (list: string[]) => [...new Set(list)].sort();

describe("Übersetzungsdateien", () => {
  it.each([
    ["ar", ar],
    ["fr", fr],
    ["en", en],
  ])("%s has exactly the German keys", (_lang, locale) => {
    expect(unique(keys(locale as Tree))).toEqual(unique(keys(de as Tree)));
  });

  it("writes every Arabic text in Arabic", () => {
    const notArabic = values(ar as Tree).filter((v) => !/[؀-ۿ]/.test(v));
    // Reine Platzhalter/Marken/Beispieladressen dürfen lateinisch bleiben
    expect(notArabic).toEqual(["you@example.com"]);
  });

  it("covers every Arabic plural form for page counts", () => {
    for (const form of ["zero", "one", "two", "few", "many", "other"]) {
      expect(ar.book).toHaveProperty(`pages_${form}`);
    }
  });
});

describe("i18n config", () => {
  it("knows all four app languages", () => {
    for (const lang of ["de", "ar", "fr", "en"]) {
      expect(i18n.hasResourceBundle(lang, "translation")).toBe(true);
    }
  });

  it("speaks Arabic with correct plurals", async () => {
    await i18n.changeLanguage("ar");
    expect(i18n.t("book.pages", { count: 2 })).toBe("صفحتان");
    expect(i18n.t("book.pages", { count: 5 })).toBe("5 صفحات");
    expect(i18n.t("book.pages", { count: 12 })).toBe("12 صفحة");
    await i18n.changeLanguage("de");
    expect(i18n.t("book.pages", { count: 1 })).toBe("1 Seite");
  });
});
