import { describe, it, expect, beforeEach } from "vitest";
import type { Language } from "@omarsapp/shared-types";
import { useUIStore } from "../ui-store";

describe("useUIStore — App-Sprache", () => {
  beforeEach(() => {
    useUIStore.setState({ language: "de" });
  });

  it("starts in German", () => {
    expect(useUIStore.getState().language).toBe("de");
  });

  it.each<Language>(["ar", "fr", "en", "de"])(
    "remembers %s as the app language",
    (language) => {
      useUIStore.getState().setLanguage(language);
      expect(useUIStore.getState().language).toBe(language);
    },
  );
});
