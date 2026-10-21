import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Switch, Route } from "react-router-dom";
import ReaderPage from "../ReaderPage";

// ─── Mock child components ──────────────────────────────────────────────────
vi.mock("../../components/reader/AudioPlayer", () => ({
  AudioPlayer: ({ audioUrl }: { audioUrl: string }) => (
    <div data-testid="audio-player" data-src={audioUrl}>
      AudioPlayer
    </div>
  ),
}));
vi.mock("../../components/reader/WordHighlighter", () => ({
  WordHighlighter: ({ text }: { text: string }) => (
    <div data-testid="word-highlighter">{text}</div>
  ),
}));
vi.mock("../../components/reader/LanguagePicker", () => ({
  LanguagePicker: () => <div data-testid="language-picker">LanguagePicker</div>,
}));
vi.mock("../../components/reader/DualLanguageView", () => ({
  DualLanguageView: () => (
    <div data-testid="dual-language-view">DualLanguageView</div>
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
  page_count: 3,
  price_single: 1.99,
  titles: {
    de: "Das Abenteuer",
    ar: "المغامرة",
    fr: "L'Aventure",
    en: "The Adventure",
  },
  pages: [
    {
      page_number: 1,
      texts: {
        de: "Seite eins Text",
        ar: "نص الصفحة الأولى",
        fr: "Texte page un",
        en: "Page one text",
      },
      illustration_url: "https://example.com/page1.jpg",
      audio_urls: { de: "https://example.com/audio1-de.mp3" },
      word_timestamps: { de: [] },
    },
    {
      page_number: 2,
      texts: {
        de: "Seite zwei Text",
        ar: "نص الصفحة الثانية",
        fr: "Texte page deux",
        en: "Page two text",
      },
      illustration_url: null,
      audio_urls: { de: "https://example.com/audio2-de.mp3" },
      word_timestamps: { de: [] },
    },
    {
      page_number: 3,
      texts: { de: "Seite drei Text", ar: "", fr: "", en: "" },
      illustration_url: null,
      audio_urls: {},
      word_timestamps: {},
    },
  ],
};

function renderReaderPage(bookId = "book-1", search = "") {
  return render(
    <MemoryRouter initialEntries={[`/books/${bookId}/read${search}`]}>
      <Switch>
        <Route exact path="/books/:bookId/read" component={ReaderPage} />
        <Route
          exact
          path="/books/:bookId"
          render={() => <div>BookDetail</div>}
        />
      </Switch>
    </MemoryRouter>,
  );
}

describe("ReaderPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockNavigate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading state while fetching", async () => {
    // fetch never resolves during this test
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    renderReaderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));
    renderReaderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/fehler|error/i).length).toBeGreaterThan(0);
    });
  });

  it("renders page illustration and text", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage();
    await waitFor(() => {
      expect(screen.getByTestId("word-highlighter")).toBeInTheDocument();
    });
    expect(screen.getByRole("img", { name: /seite 1/i })).toBeInTheDocument();
  });

  it("shows page navigation controls", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /zurück|prev|◀/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /weiter|next|▶/i }),
      ).toBeInTheDocument();
    });
  });

  it("navigates to next page on next button click", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /weiter|next|▶/i }),
      ).toBeInTheDocument(),
    );

    // on page 1, indicator should say "1 / 3"
    expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /weiter|next|▶/i }));
    await waitFor(() => {
      expect(screen.getByText(/2\s*\/\s*3/)).toBeInTheDocument();
    });
  });

  it("navigates to previous page on prev button click", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /weiter|next|▶/i }),
      ).toBeInTheDocument(),
    );

    // go to page 2 first
    fireEvent.click(screen.getByRole("button", { name: /weiter|next|▶/i }));
    await waitFor(() =>
      expect(screen.getByText(/2\s*\/\s*3/)).toBeInTheDocument(),
    );

    // then go back
    fireEvent.click(screen.getByRole("button", { name: /zurück|prev|◀/i }));
    await waitFor(() =>
      expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument(),
    );
  });

  it("disables prev on first page", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /zurück|prev|◀/i }),
      ).toBeInTheDocument(),
    );

    expect(
      screen.getByRole("button", { name: /zurück|prev|◀/i }),
    ).toBeDisabled();
  });

  it("disables next on last page", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /weiter|next|▶/i }),
      ).toBeInTheDocument(),
    );

    // navigate to last page
    const nextBtn = screen.getByRole("button", { name: /weiter|next|▶/i });
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);

    await waitFor(() =>
      expect(screen.getByText(/3\s*\/\s*3/)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /weiter|next|▶/i }),
    ).toBeDisabled();
  });

  it("shows page indicator", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage();
    await waitFor(() => {
      expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument();
    });
  });

  it("renders AudioPlayer", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage();
    await waitFor(() => {
      expect(screen.getByTestId("audio-player")).toBeInTheDocument();
    });
  });

  it("navigates to /books/:id on 403", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "Forbidden" }),
    } as Response);

    renderReaderPage("book-1");
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/books/book-1");
    });
  });
});
