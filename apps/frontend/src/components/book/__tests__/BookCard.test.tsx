import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookCard } from "../BookCard";
import i18n from "../../../i18n/config";
import ar from "../../../i18n/locales/ar.json";

const defaultProps = {
  id: "book-1",
  title: "Das Abenteuer im Wald",
  theme: "adventure",
  ageRange: "3-5",
  languages: ["de", "ar", "fr", "en"],
  priceSingle: 1.99,
};

describe("BookCard", () => {
  it("renders book title", () => {
    render(<BookCard {...defaultProps} />);
    expect(screen.getByText("Das Abenteuer im Wald")).toBeInTheDocument();
  });

  it("renders cover image when provided", () => {
    render(
      <BookCard
        {...defaultProps}
        coverImageUrl="https://example.com/cover.jpg"
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg");
    expect(img).toHaveAttribute("alt", "Das Abenteuer im Wald");
  });

  it("renders placeholder when no cover image", () => {
    render(<BookCard {...defaultProps} />);
    expect(screen.getByText("📚")).toBeInTheDocument();
  });

  it("shows daily badge when isDailyBook is true", () => {
    render(<BookCard {...defaultProps} isDailyBook={true} />);
    expect(screen.getByText("Täglich")).toBeInTheDocument();
  });

  it("does not show daily badge when isDailyBook is false", () => {
    render(<BookCard {...defaultProps} isDailyBook={false} />);
    expect(screen.queryByText("Täglich")).not.toBeInTheDocument();
  });

  it("shows language badges for all available languages", () => {
    render(<BookCard {...defaultProps} languages={["de", "ar", "fr", "en"]} />);
    expect(screen.getByText("🇩🇪")).toBeInTheDocument();
    expect(screen.getByText("🇸🇦")).toBeInTheDocument();
    expect(screen.getByText("🇫🇷")).toBeInTheDocument();
    expect(screen.getByText("🇬🇧")).toBeInTheDocument();
  });

  it("shows only requested language badges", () => {
    render(<BookCard {...defaultProps} languages={["de", "fr"]} />);
    expect(screen.getByText("🇩🇪")).toBeInTheDocument();
    expect(screen.getByText("🇫🇷")).toBeInTheDocument();
    expect(screen.queryByText("🇸🇦")).not.toBeInTheDocument();
    expect(screen.queryByText("🇬🇧")).not.toBeInTheDocument();
  });

  it("shows price when not purchased", () => {
    render(
      <BookCard {...defaultProps} isPurchased={false} priceSingle={1.99} />,
    );
    expect(screen.getByText("€1,99")).toBeInTheDocument();
  });

  it("shows Gekauft when isPurchased", () => {
    render(<BookCard {...defaultProps} isPurchased={true} />);
    expect(screen.getByText("Gekauft")).toBeInTheDocument();
  });

  it("shows Gratis instead of €0,00 for free books", () => {
    render(<BookCard {...defaultProps} isPurchased={false} priceSingle={0} />);
    expect(screen.getByText("Gratis")).toBeInTheDocument();
    expect(screen.queryByText("€0,00")).not.toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<BookCard {...defaultProps} onClick={handleClick} />);
    const card = screen.getByRole("article");
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is keyboard accessible (Enter key triggers onClick)", () => {
    const handleClick = vi.fn();
    render(<BookCard {...defaultProps} onClick={handleClick} />);
    const card = screen.getByRole("article");
    fireEvent.keyDown(card, { key: "Enter", code: "Enter" });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("has correct aria-label", () => {
    render(<BookCard {...defaultProps} />);
    const card = screen.getByRole("article");
    expect(card).toHaveAttribute("aria-label", "Buch: Das Abenteuer im Wald");
  });

  it("shows age range badge", () => {
    render(<BookCard {...defaultProps} ageRange="3-5" />);
    expect(screen.getByText("3-5 Jahre")).toBeInTheDocument();
  });

  it("is focusable (has tabIndex)", () => {
    render(<BookCard {...defaultProps} />);
    const card = screen.getByRole("article");
    expect(card).toHaveAttribute("tabindex", "0");
  });
});

describe("BookCard auf Arabisch", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("ar");
  });

  it("labels price, age and badges in Arabic", () => {
    render(<BookCard {...defaultProps} isDailyBook />);
    expect(screen.getByText("1.99 يورو")).toBeInTheDocument();
    expect(screen.getByText("3-5 سنوات")).toBeInTheDocument();
    expect(screen.getByText(ar.book.daily)).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: "كتاب: Das Abenteuer im Wald" }),
    ).toBeInTheDocument();
  });

  it("shows free and purchased books in Arabic", () => {
    const { rerender } = render(<BookCard {...defaultProps} priceSingle={0} />);
    expect(screen.getByText(ar.book.free)).toBeInTheDocument();
    rerender(<BookCard {...defaultProps} isPurchased />);
    expect(screen.getByText(ar.book.purchased)).toBeInTheDocument();
  });

  it("pins the daily badge to the reading start (right in Arabic)", () => {
    render(<BookCard {...defaultProps} isDailyBook />);
    const badge = screen.getByText(ar.book.daily);
    expect(badge.className).toContain("start-2");
    expect(badge.className).not.toContain("left-2");
  });
});
