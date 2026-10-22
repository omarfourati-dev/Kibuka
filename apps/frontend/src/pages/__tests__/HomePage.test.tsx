import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Switch, Route } from "react-router-dom";
import HomePage from "../HomePage";

// ─── Mock child components ───────────────────────────────────────────────────
vi.mock("../../components/book/BookHero", () => ({
  BookHero: ({ book }: { book: { title: string } }) => (
    <div data-testid="book-hero">{book.title}</div>
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
});
