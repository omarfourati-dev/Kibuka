import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Switch, Route } from "react-router-dom";
import LibraryPage from "../LibraryPage";

// ─── Mock child components ───────────────────────────────────────────────────
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

function renderLibraryPage() {
  return render(
    <MemoryRouter initialEntries={["/library"]}>
      <Switch>
        <Route exact path="/library" component={LibraryPage} />
        <Route path="/books/:bookId" render={() => <div>BookDetail</div>} />
      </Switch>
    </MemoryRouter>,
  );
}

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockNavigate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders filter bar", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ items: bookList, total: 2, page: 1, page_size: 12 }),
    } as Response);

    renderLibraryPage();
    // Filter bar should be present from the start (not dependent on data load)
    expect(
      screen.getByRole("combobox", { name: /sprache|language/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /alter|age/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /thema|theme/i }),
    ).toBeInTheDocument();
  });

  it("renders book cards after load", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ items: bookList, total: 2, page: 1, page_size: 12 }),
    } as Response);

    renderLibraryPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("book-card")).toHaveLength(2);
    });
    expect(screen.getByText("Erstes Buch")).toBeInTheDocument();
    expect(screen.getByText("Zweites Buch")).toBeInTheDocument();
  });

  it("shows pagination controls", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ items: bookList, total: 20, page: 1, page_size: 12 }),
    } as Response);

    renderLibraryPage();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /zurück|prev|previous/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /weiter|next/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows empty state when no books found", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ items: [], total: 0, page: 1, page_size: 12 }),
    } as Response);

    renderLibraryPage();
    await waitFor(() => {
      expect(screen.getByText(/keine bücher/i)).toBeInTheDocument();
    });
  });

  it("navigates to /books/:id when BookCard is clicked", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ items: bookList, total: 2, page: 1, page_size: 12 }),
    } as Response);

    renderLibraryPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("book-card")).toHaveLength(2);
    });

    fireEvent.click(screen.getByText("Erstes Buch"));
    expect(mockNavigate).toHaveBeenCalledWith("/books/book-1");
  });

  it("re-fetches when filter changes", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ items: bookList, total: 2, page: 1, page_size: 12 }),
    } as Response);

    renderLibraryPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("book-card")).toHaveLength(2);
    });

    const callsBefore = vi.mocked(fetch).mock.calls.length;

    // Change language filter
    const languageSelect = screen.getByRole("combobox", {
      name: /sprache|language/i,
    });
    fireEvent.change(languageSelect, { target: { value: "de" } });

    await waitFor(() => {
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
