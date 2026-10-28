import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Switch, Route } from "react-router-dom";
import { useUIStore } from "@omarsapp/shared-stores";
import i18n from "../../i18n/config";
import ar from "../../i18n/locales/ar.json";
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
  WordHighlighter: ({
    text,
    currentTimeMs,
  }: {
    text: string;
    currentTimeMs: number;
  }) => (
    <div data-testid="word-highlighter" data-time={currentTimeMs}>
      {text}
    </div>
  ),
}));
vi.mock("../../components/reader/LanguagePicker", () => ({
  LanguagePicker: () => <div data-testid="language-picker">LanguagePicker</div>,
}));
vi.mock("../../components/reader/DualLanguageView", () => ({
  DualLanguageView: ({
    primaryLanguage,
    secondaryLanguage,
  }: {
    primaryLanguage: string;
    secondaryLanguage: string;
  }) => (
    <div
      data-testid="dual-language-view"
      data-primary={primaryLanguage}
      data-secondary={secondaryLanguage}
    >
      DualLanguageView
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

function swipe(
  el: Element,
  fromX: number,
  toX: number,
  fromY = 200,
  toY = 200,
) {
  fireEvent.touchStart(el, { touches: [{ clientX: fromX, clientY: fromY }] });
  fireEvent.touchEnd(el, {
    changedTouches: [{ clientX: toX, clientY: toY }],
  });
}

describe("ReaderPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("de");
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

  it("turns 'next' into 'Fertig' on the last page, which closes the book", async () => {
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
      screen.queryByRole("button", { name: /weiter|next|▶/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fertig" }));
    expect(mockNavigate).toHaveBeenCalledWith("/books/book-1");
  });

  it("highlights no word before reading aloud starts (live: first word lit up)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage();
    const text = await screen.findByTestId("word-highlighter");
    // Das erste Wort beginnt bei 0 ms — "keine Wiedergabe" muss davor liegen
    expect(Number(text.dataset.time)).toBeLessThan(0);
  });

  it("names the book at the top in the reading language", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage("book-1", "?language=fr");
    expect(
      await screen.findByRole("heading", { level: 1, name: "L'Aventure" }),
    ).toBeInTheDocument();
  });

  it("tells screen readers how far into the book they are", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage();
    const progress = await screen.findByRole("progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "1");
    expect(progress).toHaveAttribute("aria-valuemax", "3");
    expect(progress).toHaveAccessibleName("Seite 1 von 3");
    fireEvent.click(screen.getByRole("button", { name: /weiter/i }));
    await waitFor(() =>
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "2",
      ),
    );
  });

  it("labels the two-language switch in words, not 'A|B'", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage();
    const toggle = await screen.findByRole("button", {
      name: "Zwei Sprachen",
    });
    expect(toggle).toHaveTextContent("Zwei Sprachen");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
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

  it("offers a close button that returns to the book detail", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage("book-1");
    await waitFor(() => {
      expect(screen.getByTestId("word-highlighter")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /schließen|reader verlassen/i }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/books/book-1");
  });

  it("navigates to /login with a redirect back to the book on 401", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Unauthorized" }),
    } as Response);

    renderReaderPage("book-1");
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/^\/login\?redirect=.*book-1/),
      );
    });
  });

  describe("auf Arabisch", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("ar");
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBook),
      } as Response);
    });

    it("opens the book in the app language when no language is given", async () => {
      renderReaderPage();
      expect(await screen.findByText("نص الصفحة الأولى")).toBeInTheDocument();
    });

    it("labels the controls in Arabic", async () => {
      renderReaderPage();
      await screen.findByTestId("word-highlighter");
      expect(
        screen.getByRole("button", { name: ar.reader.exit }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: ar.reader.prevPage }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: ar.reader.nextPage }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: ar.reader.dualMode }),
      ).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "الصفحة 1" })).toBeInTheDocument();
    });

    it("names the book in the browser tab", async () => {
      renderReaderPage();
      await screen.findByTestId("word-highlighter");
      expect(document.title).toBe("اقرأ: المغامرة | Kibuka");
    });

    it("shows the app language as the second language next to the book", async () => {
      // Arabische Familie liest das deutsche Buch: daneben Arabisch, nicht Englisch
      renderReaderPage("book-1", "?language=de");
      fireEvent.click(
        await screen.findByRole("button", { name: ar.reader.dualMode }),
      );
      const dual = screen.getByTestId("dual-language-view");
      expect(dual).toHaveAttribute("data-primary", "de");
      expect(dual).toHaveAttribute("data-secondary", "ar");
    });

    it("turns the page with the left arrow key, like the mirrored buttons", async () => {
      renderReaderPage();
      await screen.findByTestId("word-highlighter");
      expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument();
      fireEvent.keyDown(window, { key: "ArrowLeft" });
      await waitFor(() =>
        expect(screen.getByText(/2\s*\/\s*3/)).toBeInTheDocument(),
      );
      fireEvent.keyDown(window, { key: "ArrowRight" });
      await waitFor(() =>
        expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument(),
      );
    });

    it("explains a loading error in Arabic", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("down"));
      renderReaderPage();
      expect(await screen.findByText(ar.reader.loadError)).toBeInTheDocument();
    });
  });

  it("puts English next to a German book when the app is German", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);
    renderReaderPage("book-1", "?language=de");
    fireEvent.click(
      await screen.findByRole("button", { name: "Zwei Sprachen" }),
    );
    expect(screen.getByTestId("dual-language-view")).toHaveAttribute(
      "data-secondary",
      "en",
    );
  });

  it("turns pages with the right arrow key in left-to-right languages", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);
    renderReaderPage();
    await screen.findByTestId("word-highlighter");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() =>
      expect(screen.getByText(/2\s*\/\s*3/)).toBeInTheDocument(),
    );
  });

  describe("Wischen auf dem Handy", () => {
    beforeEach(() => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBook),
      } as Response);
    });

    it("swiping left turns to the next page, right goes back", async () => {
      renderReaderPage();
      await screen.findByTestId("word-highlighter");
      swipe(screen.getByRole("article"), 300, 100);
      await waitFor(() =>
        expect(screen.getByText(/2\s*\/\s*3/)).toBeInTheDocument(),
      );
      swipe(screen.getByRole("article"), 100, 300);
      await waitFor(() =>
        expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument(),
      );
    });

    it("ignores short and mostly vertical moves (scrolling the text)", async () => {
      renderReaderPage();
      await screen.findByTestId("word-highlighter");
      swipe(screen.getByRole("article"), 200, 170);
      swipe(screen.getByRole("article"), 300, 200, 100, 400);
      expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument();
    });

    it("swipes the other way round in Arabic, like a right-to-left book", async () => {
      await i18n.changeLanguage("ar");
      renderReaderPage();
      await screen.findByTestId("word-highlighter");
      swipe(screen.getByRole("article"), 100, 300);
      await waitFor(() =>
        expect(screen.getByText(/2\s*\/\s*3/)).toBeInTheDocument(),
      );
    });
  });

  it("keeps an explicit ?language over the app language", async () => {
    useUIStore.setState({ language: "ar" });
    await i18n.changeLanguage("ar");
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBook),
    } as Response);

    renderReaderPage("book-1", "?language=fr");
    expect(await screen.findByText("Texte page un")).toBeInTheDocument();
    useUIStore.setState({ language: "de" });
  });
});
