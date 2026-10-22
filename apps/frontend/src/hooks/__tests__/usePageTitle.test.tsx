import { describe, it, expect, beforeEach } from "vitest";
import { act, render } from "@testing-library/react";
import type { ComponentType } from "react";
import {
  MemoryRouter,
  Route,
  useHistory,
  type match,
  type RouteProps,
} from "react-router-dom";
import { usePageTitle } from "../usePageTitle";

function Page({ title }: { title: string }) {
  usePageTitle(title);
  return null;
}

// Ionic reicht gecachten Seiten ihren eigenen Match als computedMatch durch —
// react-router kennt die Prop, seine Typings nicht
const CachedRoute = Route as unknown as ComponentType<
  RouteProps & { computedMatch: match }
>;

let history: ReturnType<typeof useHistory>;
function CaptureHistory() {
  history = useHistory();
  return null;
}

describe("usePageTitle", () => {
  beforeEach(() => {
    document.title = "Kibuka";
  });

  it("sets the browser tab title of the page being shown", () => {
    render(
      <MemoryRouter initialEntries={["/library"]}>
        <Route path="/library" render={() => <Page title="Bibliothek" />} />
      </MemoryRouter>,
    );
    expect(document.title).toBe("Bibliothek");
  });

  it("updates the title when it changes, e.g. after a language switch", () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={["/library"]}>
        <Page title="Bibliothek" />
      </MemoryRouter>,
    );
    rerender(
      <MemoryRouter initialEntries={["/library"]}>
        <Page title="المكتبة" />
      </MemoryRouter>,
    );
    expect(document.title).toBe("المكتبة");
  });

  it("ignores pages Ionic keeps alive in the background", () => {
    // Ionic rendert besuchte Tab-Seiten weiter — mit IHREM Match, aber der
    // aktuellen Location. Nur die sichtbare Seite darf den Titel setzen.
    const homeMatch = { path: "/ar", url: "/ar", isExact: true, params: {} };
    render(
      <MemoryRouter initialEntries={["/ar"]}>
        <CaptureHistory />
        <CachedRoute
          exact
          path="/ar"
          computedMatch={homeMatch}
          render={() => <Page title="الرئيسية" />}
        />
        <Route exact path="/library" render={() => <Page title="المكتبة" />} />
      </MemoryRouter>,
    );
    expect(document.title).toBe("الرئيسية");

    act(() => history.push("/library"));
    expect(document.title).toBe("المكتبة");

    act(() => history.push("/ar"));
    expect(document.title).toBe("الرئيسية");
  });
});
