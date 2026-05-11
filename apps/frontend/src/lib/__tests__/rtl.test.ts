import { describe, it, expect } from "vitest";
import { isRTL, getDir, getFontFamily, getTextAlign } from "../rtl";

describe("isRTL", () => {
  it("returns true for Arabic", () => {
    expect(isRTL("ar")).toBe(true);
  });

  it("returns false for German", () => {
    expect(isRTL("de")).toBe(false);
  });

  it("returns false for French", () => {
    expect(isRTL("fr")).toBe(false);
  });

  it("returns false for English", () => {
    expect(isRTL("en")).toBe(false);
  });
});

describe("getDir", () => {
  it("returns rtl for Arabic", () => {
    expect(getDir("ar")).toBe("rtl");
  });

  it("returns ltr for German", () => {
    expect(getDir("de")).toBe("ltr");
  });

  it("returns ltr for French", () => {
    expect(getDir("fr")).toBe("ltr");
  });

  it("returns ltr for English", () => {
    expect(getDir("en")).toBe("ltr");
  });
});

describe("getFontFamily", () => {
  it("returns Arabic font for ar", () => {
    const font = getFontFamily("ar");
    expect(font).toContain("Noto Naskh Arabic");
  });

  it("returns Latin font for de", () => {
    const font = getFontFamily("de");
    expect(font).toContain("Nunito");
  });

  it("returns Latin font for fr", () => {
    const font = getFontFamily("fr");
    expect(font).toContain("Nunito");
  });

  it("returns Latin font for en", () => {
    const font = getFontFamily("en");
    expect(font).toContain("Nunito");
  });
});

describe("getTextAlign", () => {
  it("returns right for Arabic", () => {
    expect(getTextAlign("ar")).toBe("right");
  });

  it("returns left for German", () => {
    expect(getTextAlign("de")).toBe("left");
  });

  it("returns left for French", () => {
    expect(getTextAlign("fr")).toBe("left");
  });

  it("returns left for English", () => {
    expect(getTextAlign("en")).toBe("left");
  });
});
