import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Switch, Route } from "react-router-dom";
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

// ─── Mock useHistory ─────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
const mockHistory = { push: mockNavigate, replace: vi.fn(), goBack: vi.fn() };
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useHistory: () => mockHistory };
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
  // Der echte Backend-Vertrag: Detail liefert preview_pages, nicht pages
  preview_pages: [
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
const freeDailyBook = {
  ...mockBook,
  is_daily_book: true,
  price_single: 0,
};

function renderBookDetailPage(bookId = "book-1") {
  return render(
    <MemoryRouter initialEntries={[`/books/${bookId}`]}>
      <Switch>
        <Route exact path="/books/:bookId" component={BookDetailPage} />
        <Route exact path="/library" render={() => <div>Library</div>} />
        <Route
          exact
          path="/books/:bookId/read"
          render={() => <div>ReaderPage</div>}
        />
      </Switch>
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

  it("renders the preview from the backend's preview_pages field", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderBookDetailPage();
    await waitFor(() => {
      expect(screen.getByTestId("book-preview")).toBeInTheDocument();
    });
    expect(screen.getByText("Vorschau")).toBeInTheDocument();
  });

  it("shows a free-read CTA instead of €0,00 kaufen for the daily book", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(freeDailyBook),
    } as Response);

    renderBookDetailPage();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /gratis lesen/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /kaufen/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /gratis lesen/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/books/book-1/read"),
    );
  });

  it("starts stripe checkout when buy button is clicked", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (String(url).includes("/billing/checkout/book")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ url: "https://checkout.stripe.com/test" }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBook),
      } as Response);
    });

    renderBookDetailPage();
    const buyButton = await screen.findByRole("button", {
      name: /kaufen|buy|€/i,
    });
    fireEvent.click(buyButton);

    await waitFor(() => {
      const checkoutCall = vi
        .mocked(fetch)
        .mock.calls.find(([url]) =>
          String(url).includes("/billing/checkout/book"),
        );
      expect(checkoutCall).toBeDefined();
      const [, init] = checkoutCall!;
      expect(init?.method).toBe("POST");
      expect(String(init?.body)).toContain("book-1");
    });
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
