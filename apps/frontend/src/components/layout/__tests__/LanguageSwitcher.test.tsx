/**
 * TDD RED: Die App-Sprache ließ sich nur tief im Profil umstellen. Der
 * Umschalter sitzt jetzt oben auf jeder Hauptseite.
 */
import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route } from "react-router-dom";
import { useUIStore } from "@omarsapp/shared-stores";
import { LanguageSwitcher } from "../LanguageSwitcher";

function renderAt(path: string) {
  let location = "";
  render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageSwitcher />
      <Route
        render={({ location: l }) => {
          location = l.pathname;
          return null;
        }}
      />
    </MemoryRouter>,
  );
  return () => location;
}

describe("LanguageSwitcher", () => {
  afterEach(() => useUIStore.setState({ language: "de" }));

  it("shows the current language by its own name and opens a list", () => {
    renderAt("/library");
    const button = screen.getByRole("button", { name: /Deutsch/ });
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    const options = screen.getAllByRole("menuitemradio");
    expect(options.map((o) => o.textContent)).toEqual([
      "Deutsch",
      "العربية",
      "Français",
      "English",
    ]);
    expect(
      screen.getByRole("menuitemradio", { name: "Deutsch" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("switches the app language and stays on the page", () => {
    const where = renderAt("/library");
    fireEvent.click(screen.getByRole("button", { name: /Deutsch/ }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));

    expect(useUIStore.getState().language).toBe("en");
    expect(where()).toBe("/library");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("moves a language home page to the home page of the new language", () => {
    useUIStore.setState({ language: "ar" });
    const where = renderAt("/ar");
    fireEvent.click(screen.getByRole("button", { name: /العربية/ }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Deutsch" }));

    // Sonst setzt die URL /ar die Sprache gleich wieder zurück
    expect(where()).toBe("/");
  });

  it("closes on Escape", () => {
    renderAt("/library");
    fireEvent.click(screen.getByRole("button", { name: /Deutsch/ }));
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
