import { describe, it, expect, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useHistory } from "react-router-dom";
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
    document.documentElement.lang = "de";
    document.documentElement.dir = "ltr";
  });

  it("sets <html lang/dir> for the Arabic landing page", () => {
    renderAt("/ar");
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("follows navigation away from a language page", () => {
    const history = renderAt("/fr");
    expect(document.documentElement.lang).toBe("fr");

    act(() => history.push("/library"));
    expect(document.documentElement.lang).toBe("de");
    expect(document.documentElement.dir).toBe("ltr");
  });
});
