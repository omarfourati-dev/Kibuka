import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { MemoryRouter, Switch, Route } from "react-router-dom";
import i18n from "../../i18n/config";
import ar from "../../i18n/locales/ar.json";
import de from "../../i18n/locales/de.json";
import HomePage from "../HomePage";

// ─── Mock child components ───────────────────────────────────────────────────
vi.mock("../../components/book/BookHero", () => ({
  BookHero: ({
    book,
    onRead,
    onPreview,
    isDaily,
    titles,
  }: {
    book: { title: string };
    onRead?: () => void;
    onPreview?: () => void;
    isDaily?: boolean;
    titles?: Record<string, string>;
  }) => (
    <div
      data-testid="book-hero"
      data-daily={String(Boolean(isDaily))}
      data-languages={Object.keys(titles ?? {}).join(",")}
    >
      {book.title}
      <button onClick={onRead}>HeroRead</button>
      <button onClick={onPreview}>HeroPreview</button>
    </div>
  ),
}));

vi.mock("../../components/book/BookCard", () => ({
  BookCard: ({ title, onClick }: { title: string; onClick?: () => void }) => (
    <div data-testid="book-card" onClick={onClick}>
      {title}
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
const dailyBook = {
  id: "daily-1",
  theme: "nature",
  age_range: "3-5",
  cover_image_url: null,
  is_daily_book: true,
  published_at: "2026-01-01T00:00:00Z",
  page_count: 5,
  price_single: 1.99,
  titles: { de: "Das tägliche Abenteuer", ar: "", fr: "", en: "" },
};

const bookList = [
  {
    id: "book-1",
    theme: "adventure",
    age_range: "3-5",
    cover_image_url: null,
    is_daily_book: false,
    published_at: "2026-01-02T00:00:00Z",
    page_count: 4,
    price_single: 1.99,
    titles: { de: "Erstes Buch", ar: "", fr: "", en: "" },
  },
  {
    id: "book-2",
    theme: "animals",
    age_range: "6-8",
    cover_image_url: null,
    is_daily_book: false,
    published_at: "2026-01-03T00:00:00Z",
    page_count: 6,
    price_single: 2.49,
    titles: { de: "Zweites Buch", ar: "", fr: "", en: "" },
  },
];

function renderHomePage() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Switch>
        <Route exact path="/" component={HomePage} />
        <Route path="/books/:bookId" render={() => <div>BookDetail</div>} />
      </Switch>
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockNavigate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading skeleton initially", async () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    renderHomePage();
    // Should show skeleton / loading indicators before data arrives
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("free daily book hero CTA goes straight to the reader", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (String(url).includes("/daily")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...dailyBook, price_single: 0 }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ items: [], total: 0, page: 1, page_size: 6 }),
      } as Response);
    });

    renderHomePage();
    await waitFor(() => {
      expect(screen.getByTestId("book-hero")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("HeroRead"));
    expect(mockNavigate).toHaveBeenCalledWith("/books/daily-1/read");

    fireEvent.click(screen.getByText("HeroPreview"));
    expect(mockNavigate).toHaveBeenCalledWith("/books/daily-1");
  });

  it("shows an error state with retry instead of a fake empty state", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("down"));
    vi.mocked(fetch).mockRejectedValueOnce(new Error("down"));

    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText(/schiefgelaufen/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/keine bücher/i)).not.toBeInTheDocument();

    vi.mocked(fetch).mockImplementation((url) => {
      if (String(url).includes("/daily")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(dailyBook),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ items: bookList, total: 2, page: 1, page_size: 6 }),
      } as Response);
    });
    fireEvent.click(screen.getByRole("button", { name: /erneut versuchen/i }));
    await waitFor(() => {
      expect(screen.getByTestId("book-hero")).toBeInTheDocument();
    });
  });

  it("requests the book grid with the backend's snake_case page_size param", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (String(url).includes("/daily")) {
        return Promise.resolve({ ok: false } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ items: [], total: 0, page: 1, page_size: 6 }),
      } as Response);
    });

    renderHomePage();
    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining("page_size=6"),
        expect.anything(),
      );
    });
  });

  it("renders BookHero with daily book after load", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (String(url).includes("/daily")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(dailyBook),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ items: bookList, total: 2, page: 1, page_size: 6 }),
      } as Response);
    });

    renderHomePage();
    await waitFor(() => {
      expect(screen.getByTestId("book-hero")).toBeInTheDocument();
    });
    expect(screen.getByTestId("book-hero")).toHaveTextContent(
      "Das tägliche Abenteuer",
    );
  });

  it("renders BookCards after load", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (String(url).includes("/daily")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(dailyBook),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ items: bookList, total: 2, page: 1, page_size: 6 }),
      } as Response);
    });

    renderHomePage();
    await waitFor(() => {
      expect(screen.getAllByTestId("book-card")).toHaveLength(2);
    });
    expect(screen.getByText("Erstes Buch")).toBeInTheDocument();
    expect(screen.getByText("Zweites Buch")).toBeInTheDocument();
  });

  it("shows empty state when no books", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (String(url).includes("/daily")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(null),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ items: [], total: 0, page: 1, page_size: 6 }),
      } as Response);
    });

    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText(/keine bücher/i)).toBeInTheDocument();
    });
  });

  it("navigates to /books/:id when BookCard is clicked", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (String(url).includes("/daily")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(dailyBook),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ items: bookList, total: 2, page: 1, page_size: 6 }),
      } as Response);
    });

    renderHomePage();
    await waitFor(() => {
      expect(screen.getAllByTestId("book-card")).toHaveLength(2);
    });

    fireEvent.click(screen.getByText("Erstes Buch"));
    expect(mockNavigate).toHaveBeenCalledWith("/books/book-1");
  });

  it("shows book titles in the app language", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (String(url).includes("/daily")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ...dailyBook,
              titles: { ...dailyBook.titles, ar: "المغامرة اليومية" },
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                ...bookList[0],
                titles: { de: "Erstes Buch", ar: "الكتاب الأول" },
              },
              bookList[1],
            ],
            total: 2,
            page: 1,
            page_size: 6,
          }),
      } as Response);
    });

    await i18n.changeLanguage("ar");
    render(
      <MemoryRouter initialEntries={["/ar"]}>
        <HomePage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getAllByTestId("book-card")).toHaveLength(2);
    });
    expect(screen.getByTestId("book-hero")).toHaveTextContent(
      "المغامرة اليومية",
    );
    expect(screen.getByText("الكتاب الأول")).toBeInTheDocument();
    // Ohne arabische Übersetzung bleibt der deutsche Titel stehen
    expect(screen.getByText("Zweites Buch")).toBeInTheDocument();
  });

  describe("auf Arabisch", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("ar");
    });

    it("labels the book grid in Arabic", async () => {
      vi.mocked(fetch).mockImplementation((url) =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(
              String(url).includes("/daily")
                ? dailyBook
                : { items: bookList, total: 2, page: 1, page_size: 6 },
            ),
        } as Response),
      );

      renderHomePage();
      expect(
        await screen.findByRole("heading", { name: ar.home.allBooks }),
      ).toBeInTheDocument();
      expect(screen.queryByText(de.home.allBooks)).not.toBeInTheDocument();
    });

    it("explains a loading error in Arabic", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("down"));

      renderHomePage();
      expect(await screen.findByText(ar.states.errorTitle)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: ar.states.retry }),
      ).toBeInTheDocument();
    });

    it("shows the empty state in Arabic", async () => {
      vi.mocked(fetch).mockImplementation((url) =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(
              String(url).includes("/daily")
                ? null
                : { items: [], total: 0, page: 1, page_size: 6 },
            ),
        } as Response),
      );

      renderHomePage();
      expect(await screen.findByText(ar.home.emptyTitle)).toBeInTheDocument();
    });

    it("puts the Arabic home title in the browser tab", () => {
      vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
      renderHomePage();
      expect(document.title).toBe(ar.meta.home);
    });
  });

  it("puts the German home title in the browser tab", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    renderHomePage();
    expect(document.title).toBe(de.meta.home);
  });

  it("treats today's book as free today, whatever its single price (live bug)", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (String(url).includes("/daily")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...dailyBook, price_single: 2.99 }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ items: [], total: 0, page: 1, page_size: 6 }),
      } as Response);
    });

    renderHomePage();
    const hero = await screen.findByTestId("book-hero");
    expect(hero).toHaveAttribute("data-daily", "true");
    expect(hero).toHaveAttribute("data-languages", "de,ar,fr,en");
    fireEvent.click(screen.getByText("HeroRead"));
    // Ohne Konto fängt der Reader das per Login ab — hier zählt: nicht kaufen
    expect(mockNavigate).toHaveBeenCalledWith("/books/daily-1/read");
  });

  it("shows this week's books on a shelf, newest first, labelled by day", async () => {
    const today = new Date().toISOString();
    const daysAgo = (n: number) =>
      new Date(Date.now() - n * 86_400_000).toISOString();
    vi.mocked(fetch).mockImplementation((url) => {
      if (String(url).includes("/daily")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...dailyBook, published_at: today }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              { ...dailyBook, published_at: today },
              { ...bookList[0], published_at: daysAgo(3) },
              { ...bookList[1], published_at: daysAgo(1) },
              // Älter als eine Woche: nicht im Regal, sondern unter "Alle Bücher"
              { ...bookList[0], id: "old-1", published_at: daysAgo(30) },
            ],
            total: 4,
            page: 1,
            page_size: 6,
          }),
      } as Response);
    });

    renderHomePage();
    const shelf = await screen.findByRole("region", { name: "Diese Woche" });
    const items = within(shelf).getAllByRole("link");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAccessibleName(/Heute.*Das tägliche Abenteuer/);
    expect(items[1]).toHaveAccessibleName(/Gestern.*Zweites Buch/);
    fireEvent.click(items[1]);
    expect(mockNavigate).toHaveBeenCalledWith("/books/book-2");
    // Nichts doppelt: unter "Alle Bücher" steht nur das ältere Buch
    expect(screen.getAllByTestId("book-card")).toHaveLength(1);
  });

  it("shows today's date above the book of the day", async () => {
    vi.mocked(fetch).mockImplementation((url) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            String(url).includes("/daily")
              ? dailyBook
              : { items: [], total: 0, page: 1, page_size: 6 },
          ),
      } as Response),
    );
    renderHomePage();
    await screen.findByTestId("book-hero");
    const weekday = new Date().toLocaleDateString("de-DE", { weekday: "long" });
    expect(screen.getByText(new RegExp(`^${weekday}, `))).toBeInTheDocument();
  });
});
