/**
 * TDD RED: Impressum (§ 5 DDG) unmittelbar erreichbar und Kündigungsbutton
 * (§ 312k BGB) ständig verfügbar — auf jeder Seite, ohne Login.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "../../../i18n/config";
import { LegalFooter } from "../LegalFooter";
import {
  CANCELLATION_PATH,
  IMPRINT_URL,
  PRIVACY_URL,
} from "../../../lib/legal";

function renderFooter() {
  return render(
    <MemoryRouter>
      <LegalFooter />
    </MemoryRouter>,
  );
}

describe("LegalFooter", () => {
  it("links imprint and privacy policy in a new tab", () => {
    renderFooter();
    const imprint = screen.getByRole("link", { name: "Impressum" });
    const privacy = screen.getByRole("link", { name: "Datenschutz" });
    expect(imprint).toHaveAttribute("href", IMPRINT_URL);
    expect(privacy).toHaveAttribute("href", PRIVACY_URL);
    for (const link of [imprint, privacy]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("offers the legally worded cancellation button", () => {
    renderFooter();
    expect(
      screen.getByRole("link", { name: "Verträge hier kündigen" }),
    ).toHaveAttribute("href", CANCELLATION_PATH);
  });

  it("is a contentinfo landmark", () => {
    renderFooter();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("speaks the app language", async () => {
    await i18n.changeLanguage("en");
    renderFooter();
    expect(
      screen.getByRole("link", { name: "Legal notice" }),
    ).toBeInTheDocument();
  });
});
