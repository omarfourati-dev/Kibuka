import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguagePicker } from "../LanguagePicker";

describe("LanguagePicker", () => {
  it("renders all available language buttons", () => {
    render(
      <LanguagePicker
        availableLanguages={["de", "ar", "fr", "en"]}
        selectedLanguage="de"
        onLanguageChange={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button").length).toBe(4);
  });

  it("marks selected language as active (aria-pressed)", () => {
    render(
      <LanguagePicker
        availableLanguages={["de", "ar", "fr", "en"]}
        selectedLanguage="fr"
        onLanguageChange={vi.fn()}
      />,
    );
    const frButton = screen.getByRole("button", { name: /fr/i });
    expect(frButton).toHaveAttribute("aria-pressed", "true");

    const deButton = screen.getByRole("button", { name: /de/i });
    expect(deButton).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onLanguageChange when language button clicked", () => {
    const onLanguageChange = vi.fn();
    render(
      <LanguagePicker
        availableLanguages={["de", "ar", "fr", "en"]}
        selectedLanguage="de"
        onLanguageChange={onLanguageChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /fr/i }));
    expect(onLanguageChange).toHaveBeenCalledWith("fr");
  });

  it("renders DE flag for de", () => {
    render(
      <LanguagePicker
        availableLanguages={["de"]}
        selectedLanguage="de"
        onLanguageChange={vi.fn()}
      />,
    );
    expect(screen.getByText("🇩🇪")).toBeInTheDocument();
  });
});
