import { describe, it, expect, afterEach } from "vitest";
import { applyDocumentLanguage, languageForPath, pickTitle } from "../locale";

describe("languageForPath", () => {
  it("maps the language landing pages to their language", () => {
    expect(languageForPath("/ar")).toBe("ar");
    expect(languageForPath("/fr")).toBe("fr");
    expect(languageForPath("/en")).toBe("en");
  });

  it("accepts a trailing slash", () => {
    expect(languageForPath("/ar/")).toBe("ar");
  });

  it("keeps German for the home page and every other page", () => {
    expect(languageForPath("/")).toBe("de");
    expect(languageForPath("/library")).toBe("de");
    expect(languageForPath("/books/ar")).toBe("de");
    expect(languageForPath("/arx")).toBe("de");
    expect(languageForPath("")).toBe("de");
  });
});

describe("applyDocumentLanguage", () => {
  afterEach(() => applyDocumentLanguage("de"));

  it("sets lang and right-to-left direction for Arabic", () => {
    applyDocumentLanguage("ar");
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("switches back to left-to-right", () => {
    applyDocumentLanguage("ar");
    applyDocumentLanguage("fr");
    expect(document.documentElement.lang).toBe("fr");
    expect(document.documentElement.dir).toBe("ltr");
  });
});

describe("pickTitle", () => {
  it("prefers the title in the requested language", () => {
    expect(pickTitle({ de: "Hallo", ar: "مرحبا" }, "ar")).toBe("مرحبا");
  });

  it("falls back to German when the translation is missing or empty", () => {
    expect(pickTitle({ de: "Hallo", fr: "" }, "fr")).toBe("Hallo");
  });

  it("falls back to any title when German is missing", () => {
    expect(pickTitle({ en: "Hello" }, "de")).toBe("Hello");
    expect(pickTitle({}, "de")).toBe("");
  });
});
