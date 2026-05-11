import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PricingPage from "../PricingPage";

// Mock PricingCard to isolate PricingPage tests
vi.mock("../../components/pricing/PricingCard", () => ({
  PricingCard: ({
    title,
    price,
    badge,
    ctaLabel,
    onCta,
  }: {
    title: string;
    price: string;
    badge?: string;
    ctaLabel: string;
    onCta: () => void;
  }) => (
    <div data-testid="pricing-card">
      <span data-testid="card-title">{title}</span>
      <span data-testid="card-price">{price}</span>
      {badge && <span data-testid="card-badge">{badge}</span>}
      <button onClick={onCta}>{ctaLabel}</button>
    </div>
  ),
}));

function renderPricingPage() {
  return render(
    <MemoryRouter>
      <PricingPage />
    </MemoryRouter>,
  );
}

describe("PricingPage", () => {
  it("renders all four pricing plans", () => {
    renderPricingPage();
    const cards = screen.getAllByTestId("pricing-card");
    expect(cards).toHaveLength(4);
  });

  it("shows Beliebteste Wahl badge on monthly plan", () => {
    renderPricingPage();
    const badges = screen.getAllByTestId("card-badge");
    const beliebtesteBadge = badges.find((b) =>
      b.textContent?.includes("Beliebteste Wahl"),
    );
    expect(beliebtesteBadge).toBeTruthy();
  });

  it("shows Bestes Preis-Leistungs-Verhältnis on yearly plan", () => {
    renderPricingPage();
    const badges = screen.getAllByTestId("card-badge");
    const bestValueBadge = badges.find((b) =>
      b.textContent?.includes("Bestes Preis-Leistungs"),
    );
    expect(bestValueBadge).toBeTruthy();
  });

  it("renders FAQ section with 5 questions", () => {
    renderPricingPage();
    // FAQ section heading
    expect(
      screen.getByText(/häufig gestellte fragen|faq/i),
    ).toBeInTheDocument();
    // 5 FAQ items
    const faqItems = screen.getAllByRole("button", {
      name: /Kann ich|Welche Sprachen|Für welches Alter|Probezeit|Geräten/i,
    });
    expect(faqItems.length).toBeGreaterThanOrEqual(5);
  });

  it("FAQ answers are visible or expandable", () => {
    renderPricingPage();
    // At minimum one answer should be present or become present after interaction
    const faqButtons = screen.getAllByRole("button", {
      name: /Kann ich|Welche Sprachen|Für welches Alter|Probezeit|Geräten/i,
    });
    // Click the first FAQ item
    fireEvent.click(faqButtons[0]);
    // Answer text should appear in the document
    expect(document.body.textContent).toMatch(
      /jederzeit|kündigen|sprachen|alter|kostenlos|web|ios|android/i,
    );
  });

  it("renders CTA buttons for each plan", () => {
    renderPricingPage();
    const ctaButtons = screen.getAllByRole("button", {
      name: /Jetzt starten/i,
    });
    expect(ctaButtons.length).toBeGreaterThanOrEqual(4);
  });
});
