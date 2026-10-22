import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import i18n from "../../i18n/config";
import ar from "../../i18n/locales/ar.json";
import { ErrorBoundary } from "../ErrorBoundary";

function Broken(): JSX.Element {
  throw new Error("kaputt");
}

describe("ErrorBoundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("apologises in the app language", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await i18n.changeLanguage("ar");
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByText(ar.states.errorTitle)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: ar.states.retry }),
    ).toBeInTheDocument();
  });
});
