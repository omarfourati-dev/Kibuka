import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import BookDetailPage from "../BookDetailPage";

// ─── Mock child components ───────────────────────────────────────────────────
vi.mock("../../components/book/BookPreview", () => ({
  BookPreview: () => <div data-testid="book-preview">BookPreview</div>,
}));

vi.mock("../../components/reader/LanguagePicker", () => ({
  LanguagePicker: ({
    selectedLanguage,
    onLanguageChange,
  }: {
    selectedLanguage: string;
    onLanguageChange: (lang: string) => void;
  }) => (
    <div data-testid="language-picker">
      <button onClick={() => onLanguageChange("en")}>EN</button>
      <span>{selectedLanguage}</span>
    </div>
  ),
}));

// ─── Mock useNavigate ────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── Mock data ───────────────────────────────────────────────────────────────
const mockBook = {
  id: "book-1",
  theme: "adventure",
  age_range: "3-5",
  cover_image_url: "https://example.com/cover.jpg",
  is_daily_book: false,
  published_at: "2026-01-01T00:00:00Z",
  page_count: 5,
  price_single: 1.99,
  titles: {
    de: "Das große Abenteuer",
    ar: "المغامرة",
    fr: "La Grande Aventure",
    en: "The Big Adventure",
  },
  pages: [
    {
      page_number: 1,
      texts: { de: "Seite 1", ar: "", fr: "", en: "" },
      illustration_url: null,
      audio_urls: {},
      word_timestamps: {},
    },
    {
      page_number: 2,
      texts: { de: "Seite 2", ar: "", fr: "", en: "" },
      illustration_url: null,
      audio_urls: {},
      word_timestamps: {},
    },
  ],
  is_purchased: false,
};

const purchasedBook = { ...mockBook, is_purchased: true };

function renderBookDetailPage(bookId = "book-1") {
  return render(
    <MemoryRouter initialEntries={[`/books/${bookId}`]}>
      <Routes>
        <Route path="/books/:bookId" element={<BookDetailPage />} />
        <Route path="/library" element={<div>Library</div>} />
        <Route path="/books/:bookId/read" element={<div>ReaderPage</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BookDetailPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockNavigate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading state", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    renderBookDetailPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders book title after load", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderBookDetailPage();
    await waitFor(() => {
      expect(screen.getByText("Das große Abenteuer")).toBeInTheDocument();
    });
  });

  it("shows buy button when not purchased", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderBookDetailPage();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /kaufen|buy|€/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /lesen|read/i }),
    ).not.toBeInTheDocument();
  });

  it("shows read button when purchased", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(purchasedBook),
    } as Response);

    renderBookDetailPage();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /lesen|read/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /kaufen|buy|€/i }),
    ).not.toBeInTheDocument();
  });

  it("renders BookPreview", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderBookDetailPage();
    await waitFor(() => {
      expect(screen.getByTestId("book-preview")).toBeInTheDocument();
    });
  });

  it("renders LanguagePicker", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderBookDetailPage();
    await waitFor(() => {
      expect(screen.getByTestId("language-picker")).toBeInTheDocument();
    });
  });

  it("back button navigates to /library", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderBookDetailPage();
    await waitFor(() =>
      expect(screen.getByText("Das große Abenteuer")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /zurück|back/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/library");
  });

  it("read button navigates to /books/:id/read with selected language", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(purchasedBook),
    } as Response);

    renderBookDetailPage("book-1");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /lesen|read/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /lesen|read/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringMatching(/\/books\/book-1\/read/),
    );
  });

  it("shows error state on fetch failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    renderBookDetailPage();
    await waitFor(() => {
      expect(screen.getAllByText(/fehler|error/i).length).toBeGreaterThan(0);
    });
  });

  it("renders cover image when available", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderBookDetailPage();
    await waitFor(() => {
      expect(
        screen.getByRole("img", { name: /das große abenteuer/i }),
      ).toBeInTheDocument();
    });
  });
});
