import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { setupIonicReact } from "@ionic/react";
import i18n from "./i18n/config";

// jsdom lacks matchMedia, which Ionic core queries for platform/dark-mode detection
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

setupIonicReact({ mode: "md" });

// Tests, die auf Arabisch o. Ä. umschalten, dürfen die übrigen nicht färben
afterEach(async () => {
  await i18n.changeLanguage("de");
});
