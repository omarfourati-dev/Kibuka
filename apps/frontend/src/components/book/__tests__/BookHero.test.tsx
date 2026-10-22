import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookHero } from "../BookHero";

const defaultBook = {
  id: "book-hero-1",
  title: "Der fliegende Elefant",
  theme: "adventure",
  ageRange: "3-5",
  languages: ["de", "ar", "fr", "en"],
  priceSingle: 1.99,
};

describe("BookHero", () => {
  it("renders book title", () => {
    render(<BookHero book={defaultBook} />);
    expect(screen.getByText("Der fliegende Elefant")).toBeInTheDocument();
  });

  it("renders Buch des Tages badge", () => {
    render(<BookHero book={defaultBook} />);
    expect(screen.getByText("Buch des Tages")).toBeInTheDocument();
  });

  it("shows Jetzt lesen when isPurchased", () => {
    render(<BookHero book={defaultBook} isPurchased={true} />);
    expect(
      screen.getByRole("button", { name: /Jetzt lesen/i }),
    ).toBeInTheDocument();
  });

  it("shows price button when not purchased", () => {
    render(<BookHero book={defaultBook} isPurchased={false} />);
    expect(
      screen.getByRole("button", { name: /€1,99 kaufen/i }),
    ).toBeInTheDocument();
  });

  it("calls onRead when Jetzt lesen is clicked", () => {
    const handleRead = vi.fn();
    render(
      <BookHero book={defaultBook} isPurchased={true} onRead={handleRead} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Jetzt lesen/i }));
    expect(handleRead).toHaveBeenCalledTimes(1);
  });

  it("calls onPurchase when buy button is clicked", () => {
    const handlePurchase = vi.fn();
    render(
      <BookHero
        book={defaultBook}
        isPurchased={false}
        onPurchase={handlePurchase}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /€1,99 kaufen/i }));
    expect(handlePurchase).toHaveBeenCalledTimes(1);
  });

  it("renders languages as non-interactive badges (no dead buttons)", () => {
    render(<BookHero book={defaultBook} />);
    for (const label of ["DE", "AR", "FR", "EN"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
      // Vorher waren das <button> ohne onClick — tote Controls
      expect(
        screen.queryByRole("button", { name: label }),
      ).not.toBeInTheDocument();
    }
  });

  it("renders Vorschau lesen secondary CTA", () => {
    render(<BookHero book={defaultBook} />);
    expect(
      screen.getByRole("button", { name: /Vorschau lesen/i }),
    ).toBeInTheDocument();
  });

  it("Vorschau lesen navigates via its own onPreview handler", () => {
    const handleRead = vi.fn();
    const handlePreview = vi.fn();
    render(
      <BookHero
        book={defaultBook}
        onRead={handleRead}
        onPreview={handlePreview}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Vorschau lesen/i }));
    expect(handlePreview).toHaveBeenCalledTimes(1);
    expect(handleRead).not.toHaveBeenCalled();
  });

  it("shows Gratis lesen instead of €0,00 kaufen for a free book", () => {
    const handleRead = vi.fn();
    render(
      <BookHero
        book={{ ...defaultBook, priceSingle: 0 }}
        isPurchased={false}
        onRead={handleRead}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /kaufen/i }),
    ).not.toBeInTheDocument();
    const freeButton = screen.getByRole("button", { name: /Gratis lesen/i });
    fireEvent.click(freeButton);
    expect(handleRead).toHaveBeenCalledTimes(1);
  });

  it("renders cover image when provided", () => {
    render(
      <BookHero
        book={{ ...defaultBook, coverImageUrl: "https://example.com/hero.jpg" }}
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/hero.jpg");
  });

  it("renders placeholder when no cover image", () => {
    render(<BookHero book={defaultBook} />);
    expect(screen.getByText("📚")).toBeInTheDocument();
  });
});
