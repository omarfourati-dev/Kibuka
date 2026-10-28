import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookHero } from "../BookHero";
import i18n from "../../../i18n/config";
import ar from "../../../i18n/locales/ar.json";

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
      screen.getByRole("button", { name: /1,99 € kaufen/i }),
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
    fireEvent.click(screen.getByRole("button", { name: /1,99 € kaufen/i }));
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

describe("BookHero – Buch des Tages", () => {
  const titles = {
    de: "Lilly, der kleine Fuchs",
    en: "Lilly, the Little Fox",
    fr: "Lilly, le petit renard",
    ar: "ليلي، الثعلبة الصغيرة",
  };

  it("is free today whatever the single price says (live bug: '€2,99 kaufen')", () => {
    const handleRead = vi.fn();
    render(
      <BookHero
        book={{ ...defaultBook, priceSingle: 2.99 }}
        isDaily
        onRead={handleRead}
      />,
    );
    expect(screen.getByText("Heute gratis")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /kaufen/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Heute gratis lesen" }));
    expect(handleRead).toHaveBeenCalledTimes(1);
  });

  it("shows the title in the other three languages, each in its own script", () => {
    render(
      <BookHero
        book={{ ...defaultBook, title: titles.de }}
        titles={titles}
        isDaily
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: titles.de }),
    ).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText(titles.en)).toHaveAttribute("lang", "en");
    expect(screen.getByText(titles.fr)).toHaveAttribute("lang", "fr");
    const arabic = screen.getByText(titles.ar);
    expect(arabic).toHaveAttribute("lang", "ar");
    expect(arabic).toHaveAttribute("dir", "rtl");
    // Die Sprache der Überschrift steht nicht noch einmal in der Liste
    expect(screen.queryByText("Deutsch")).toBeNull();
    // Lateinische Schriften zuerst, Arabisch (andere Leserichtung) zuletzt
    const terms = screen.getAllByRole("term").map((dt) => dt.textContent);
    expect(terms).toEqual(["English", "Français", "العربية"]);
  });

  it("renders the square cover as a book, not a cropped portrait", () => {
    render(
      <BookHero
        book={{ ...defaultBook, coverImageUrl: "https://example.com/c.webp" }}
        isDaily
      />,
    );
    expect(screen.getByRole("img").parentElement).toHaveClass("aspect-square");
  });
});

describe("BookHero auf Arabisch", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("ar");
  });

  it("presents today's story in Arabic", () => {
    render(<BookHero book={defaultBook} />);
    expect(screen.getByText(ar.hero.badge)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "اشترِ بـ 1.99 يورو" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: ar.hero.preview }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(ar.hero.languagesLabel)).toBeInTheDocument();
  });

  it("offers free and purchased books for reading in Arabic", () => {
    const { rerender } = render(
      <BookHero book={{ ...defaultBook, priceSingle: 0 }} />,
    );
    expect(
      screen.getByRole("button", { name: ar.hero.readFree }),
    ).toBeInTheDocument();
    rerender(<BookHero book={defaultBook} isPurchased />);
    expect(
      screen.getByRole("button", { name: ar.hero.readNow }),
    ).toBeInTheDocument();
  });
});
