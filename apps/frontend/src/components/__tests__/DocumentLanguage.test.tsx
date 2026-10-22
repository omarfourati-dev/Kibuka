import { describe, it, expect, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useHistory } from "react-router-dom";
import { useUIStore } from "@omarsapp/shared-stores";
import i18n from "../../i18n/config";
import { DocumentLanguage } from "../DocumentLanguage";

function renderAt(path: string) {
  let history: ReturnType<typeof useHistory> | undefined;
  function CaptureHistory() {
    history = useHistory();
    return null;
  }
  render(
    <MemoryRouter initialEntries={[path]}>
      <DocumentLanguage />
      <CaptureHistory />
    </MemoryRouter>,
  );
  return history!;
}

describe("DocumentLanguage", () => {
  afterEach(() => {
    act(() => useUIStore.getState().setLanguage("de"));
  });

  it("sets <html lang/dir> for the Arabic landing page", () => {
    renderAt("/ar");
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("remembers the language of a landing page in the store", () => {
    renderAt("/fr");
    expect(useUIStore.getState().language).toBe("fr");
  });

  it("switches the interface language along with it", () => {
    renderAt("/ar");
    expect(i18n.language).toBe("ar");
  });

  it("keeps the language when navigating to another page", () => {
    const history = renderAt("/ar");

    act(() => history.push("/library"));
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(i18n.language).toBe("ar");
  });

  it("shows the home page '/' in the remembered language", () => {
    act(() => useUIStore.getState().setLanguage("en"));
    renderAt("/");
    expect(document.documentElement.lang).toBe("en");
    expect(i18n.language).toBe("en");
  });

  it("follows a language change made in the app", () => {
    renderAt("/library");
    act(() => useUIStore.getState().setLanguage("ar"));
    expect(document.documentElement.dir).toBe("rtl");

    act(() => useUIStore.getState().setLanguage("de"));
    expect(document.documentElement.lang).toBe("de");
    expect(document.documentElement.dir).toBe("ltr");
    expect(i18n.language).toBe("de");
  });
});
