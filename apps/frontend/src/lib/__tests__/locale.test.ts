import { describe, it, expect, afterEach } from "vitest";
import {
  applyDocumentLanguage,
  dayLabel,
  formatDate,
  formatPrice,
  formatToday,
  homePathFor,
  isLanguage,
  landingPageLanguage,
  pickTitle,
} from "../locale";

describe("landingPageLanguage", () => {
  it("maps the language landing pages to their language", () => {
    expect(landingPageLanguage("/ar")).toBe("ar");
    expect(landingPageLanguage("/fr")).toBe("fr");
    expect(landingPageLanguage("/en")).toBe("en");
  });

  it("accepts a trailing slash", () => {
    expect(landingPageLanguage("/ar/")).toBe("ar");
  });

  it("does not choose a language for any other page", () => {
    // "/" zeigt die gespeicherte Sprache — sonst landet z. B. ein arabischer
    // Nutzer nach dem Login (Redirect auf "/") plötzlich auf Deutsch
    expect(landingPageLanguage("/")).toBeNull();
    expect(landingPageLanguage("/library")).toBeNull();
    expect(landingPageLanguage("/books/ar")).toBeNull();
    expect(landingPageLanguage("/arx")).toBeNull();
    expect(landingPageLanguage("")).toBeNull();
  });
});

describe("homePathFor", () => {
  it("leads every language to its own home page", () => {
    expect(homePathFor("de")).toBe("/");
    expect(homePathFor("ar")).toBe("/ar");
    expect(homePathFor("fr")).toBe("/fr");
    expect(homePathFor("en")).toBe("/en");
  });
});

describe("isLanguage", () => {
  it("accepts only the four app languages", () => {
    expect(isLanguage("ar")).toBe(true);
    expect(isLanguage("de")).toBe(true);
    expect(isLanguage("es")).toBe(false);
    expect(isLanguage("")).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
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

describe("formatPrice", () => {
  it("keeps the established German format", () => {
    expect(formatPrice(14.99, "de")).toBe("14,99 €");
    expect(formatPrice(99, "de")).toBe("99 €");
    expect(formatPrice(0.5, "de")).toBe("0,50 €");
  });

  it("writes prices the way each language does", () => {
    expect(formatPrice(14.99, "en")).toBe("€14.99");
    expect(formatPrice(14.99, "fr")).toBe("14,99 €");
    expect(formatPrice(14.99, "ar")).toBe("14.99 يورو");
    expect(formatPrice(99, "ar")).toBe("99 يورو");
  });
});

describe("formatDate", () => {
  const iso = "2026-11-05T10:00:00Z";

  it("names the month in the app language", () => {
    expect(formatDate(iso, "de")).toBe("5. November 2026");
    expect(formatDate(iso, "fr")).toBe("5 novembre 2026");
    expect(formatDate(iso, "en")).toBe("5 November 2026");
    expect(formatDate(iso, "ar")).toContain("نوفمبر");
  });

  it("uses Western digits in Arabic like the rest of the app", () => {
    expect(formatDate(iso, "ar")).toContain("2026");
  });

  it("returns null without a date", () => {
    expect(formatDate(null, "de")).toBeNull();
  });
});

describe("dayLabel (Regal „Diese Woche“)", () => {
  const now = new Date("2026-10-28T09:00:00");

  it("names today and yesterday", () => {
    expect(dayLabel("2026-10-28T06:00:00", "de", now)).toBe("Heute");
    expect(dayLabel("2026-10-27T06:00:00", "de", now)).toBe("Gestern");
  });

  it("uses the weekday for older days of the week", () => {
    expect(dayLabel("2026-10-25T06:00:00", "de", now)).toBe("Sonntag");
    expect(dayLabel("2026-10-25T06:00:00", "en", now)).toBe("Sunday");
    expect(dayLabel("2026-10-25T06:00:00", "ar", now)).toBe("الأحد");
  });
});

describe("formatToday", () => {
  it("writes the full date the way each language does", () => {
    const day = new Date("2026-10-28T09:00:00");
    expect(formatToday(day, "de")).toBe("Mittwoch, 28. Oktober");
    expect(formatToday(day, "en")).toBe("Wednesday 28 October");
  });
});
