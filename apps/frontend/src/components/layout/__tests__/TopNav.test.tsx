/**
 * TDD RED: Auf dem Desktop lag die Handy-Tableiste am unteren Rand. Ab
 * Tablet-Breite gibt es eine Navigation oben (die Tableiste blendet CSS aus).
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TopNav } from "../TopNav";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TopNav />
    </MemoryRouter>,
  );
}

describe("TopNav", () => {
  it("offers the four main areas with the same names as the tab bar", () => {
    renderAt("/library");
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "Heute",
      "Bibliothek",
      "Abo",
      "Familie",
    ]);
    expect(within(nav).getByRole("link", { name: "Abo" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("marks the current area", () => {
    renderAt("/library");
    expect(screen.getByRole("link", { name: "Bibliothek" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Heute" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("counts a book page as part of the library", () => {
    renderAt("/books/abc");
    expect(screen.getByRole("link", { name: "Bibliothek" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("brands the header and carries the language switcher", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: "Kibuka" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("button", { name: /Deutsch/ })).toBeInTheDocument();
  });
});
