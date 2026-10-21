import "@testing-library/jest-dom";
import { setupIonicReact } from "@ionic/react";

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
