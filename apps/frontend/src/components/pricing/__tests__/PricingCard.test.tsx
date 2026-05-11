import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PricingCard } from "../PricingCard";

const defaultProps = {
  title: "Monatlich",
  price: "€14,99",
  priceNote: "pro Monat",
  features: ["Alle Bücher", "4 Sprachen", "Audio-Vorlese-Funktion"],
  ctaLabel: "Jetzt starten",
  onCta: vi.fn(),
};

describe("PricingCard", () => {
  it("renders title and price", () => {
    render(<PricingCard {...defaultProps} />);
    expect(screen.getByText("Monatlich")).toBeInTheDocument();
    expect(screen.getByText("€14,99")).toBeInTheDocument();
  });

  it("renders all features with checkmarks", () => {
    render(<PricingCard {...defaultProps} />);
    defaultProps.features.forEach((feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });
    // Each feature should have an associated checkmark indicator
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(defaultProps.features.length);
  });

  it("shows badge when provided", () => {
    render(<PricingCard {...defaultProps} badge="Beliebteste Wahl" />);
    expect(screen.getByText("Beliebteste Wahl")).toBeInTheDocument();
  });

  it("does not show badge when not provided", () => {
    render(<PricingCard {...defaultProps} />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("applies highlighted style when isHighlighted", () => {
    const { container } = render(
      <PricingCard {...defaultProps} isHighlighted={true} />,
    );
    // The card root element should have an identifiable highlighted class
    const card = container.firstChild as HTMLElement;
    expect(card.className).toMatch(/highlighted|ring|shadow|orange|primary/i);
  });

  it("does not apply highlighted style when not highlighted", () => {
    const { container } = render(
      <PricingCard {...defaultProps} isHighlighted={false} />,
    );
    const card = container.firstChild as HTMLElement;
    // Should not have ring-2 or similar highlight indicators
    expect(card.className).not.toMatch(/ring-2|ring-orange|ring-primary/);
  });

  it("calls onCta when button clicked", () => {
    const onCta = vi.fn();
    render(<PricingCard {...defaultProps} onCta={onCta} />);
    fireEvent.click(screen.getByRole("button", { name: /Jetzt starten/i }));
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it("shows savings when provided", () => {
    render(<PricingCard {...defaultProps} savings="Spare 2 Monate" />);
    expect(screen.getByText("Spare 2 Monate")).toBeInTheDocument();
  });

  it("shows priceNote when provided", () => {
    render(<PricingCard {...defaultProps} priceNote="pro Monat" />);
    expect(screen.getByText("pro Monat")).toBeInTheDocument();
  });
});
