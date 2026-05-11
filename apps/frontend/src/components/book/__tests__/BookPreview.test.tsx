import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookPreview } from "../BookPreview";

const pages = [
  {
    pageNumber: 1,
    text: "Es war einmal ein kleiner Elefant.",
    illustrationUrl: "https://example.com/page1.jpg",
  },
  {
    pageNumber: 2,
    text: "Der Elefant wollte fliegen.",
    illustrationUrl: "https://example.com/page2.jpg",
  },
];

describe("BookPreview", () => {
  it("renders all pages", () => {
    render(<BookPreview pages={pages} language="de" />);
    // Both pages should be visible
    expect(
      screen.getByText("Es war einmal ein kleiner Elefant."),
    ).toBeInTheDocument();
    expect(screen.getByText("Der Elefant wollte fliegen.")).toBeInTheDocument();
  });

  it("renders page text", () => {
    render(<BookPreview pages={pages} language="de" />);
    expect(
      screen.getByText("Es war einmal ein kleiner Elefant."),
    ).toBeInTheDocument();
  });

  it("renders illustration when provided", () => {
    render(<BookPreview pages={pages} language="de" />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("src", "https://example.com/page1.jpg");
    expect(images[1]).toHaveAttribute("src", "https://example.com/page2.jpg");
  });

  it("shows page number", () => {
    render(<BookPreview pages={pages} language="de" />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders without illustrations gracefully", () => {
    const pagesNoIllustration = [
      { pageNumber: 1, text: "Nur Text ohne Bild." },
    ];
    render(<BookPreview pages={pagesNoIllustration} language="de" />);
    expect(screen.getByText("Nur Text ohne Bild.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("applies RTL direction for Arabic language", () => {
    render(<BookPreview pages={pages} language="ar" />);
    const container = screen.getByTestId("book-preview");
    expect(container).toHaveAttribute("dir", "rtl");
  });

  it("applies LTR direction for German language", () => {
    render(<BookPreview pages={pages} language="de" />);
    const container = screen.getByTestId("book-preview");
    expect(container).toHaveAttribute("dir", "ltr");
  });
});
