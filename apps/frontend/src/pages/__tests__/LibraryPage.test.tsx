import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Switch, Route } from "react-router-dom";
import { useAuthStore } from "@omarsapp/shared-stores";
import i18n from "../../i18n/config";
import ar from "../../i18n/locales/ar.json";
import LibraryPage from "../LibraryPage";

// ─── Mock child components ───────────────────────────────────────────────────
vi.mock("../../components/book/BookCard", () => ({
  BookCard: ({
    title,
    onClick,
    isPurchased,
  }: {
    title: string;
    onClick?: () => void;
    isPurchased?: boolean;
  }) => (
    <div data-testid="book-card" onClick={onClick}>
      {title}
      {isPurchased ? <span>Gekauft</span> : null}
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
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
    });
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

  it("shows an error state with retry instead of a fake empty state", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));

    renderLibraryPage();
    await waitFor(() => {
      expect(screen.getByText(/schiefgelaufen/i)).toBeInTheDocument();
    });
    // Kein getarnter Empty State
    expect(screen.queryByText(/keine bücher/i)).not.toBeInTheDocument();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ items: bookList, total: 2, page: 1, page_size: 12 }),
    } as Response);
    fireEvent.click(screen.getByRole("button", { name: /erneut versuchen/i }));
    await waitFor(() => {
      expect(screen.getAllByTestId("book-card")).toHaveLength(2);
    });
  });

  it("sends auth headers and marks purchased books", async () => {
    useAuthStore.setState({
      user: { id: "u1", email: "o@example.com", name: "O", role: "member" },
      isAuthenticated: true,
      accessToken: "token-xyz",
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            { ...bookList[0], is_purchased: true },
            { ...bookList[1], is_purchased: false },
          ],
          total: 2,
          page: 1,
          page_size: 12,
        }),
    } as Response);

    renderLibraryPage();
    await waitFor(() => {
      expect(screen.getByText("Gekauft")).toBeInTheDocument();
    });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(
      (init as RequestInit | undefined)?.headers as Record<string, string>,
    ).toMatchObject({ Authorization: "Bearer token-xyz" });
  });

  it("requests the list with the backend's snake_case page_size param", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ items: bookList, total: 2, page: 1, page_size: 12 }),
    } as Response);

    renderLibraryPage();
    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining("page_size="),
        expect.anything(),
      );
    });
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

  describe("auf Arabisch", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("ar");
      vi.mocked(fetch).mockResolvedValue({
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
            page_size: 12,
          }),
      } as Response);
    });

    it("shows heading, filters and paging in Arabic", async () => {
      renderLibraryPage();
      await waitFor(() => {
        expect(screen.getAllByTestId("book-card")).toHaveLength(2);
      });

      expect(
        screen.getByRole("heading", { name: ar.library.title }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("combobox", { name: ar.library.language }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("combobox", { name: ar.library.age }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("combobox", { name: ar.library.theme }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: ar.languages.fr }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: ar.themes.animals }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "3–5 سنوات" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: ar.library.nextLabel }),
      ).toBeInTheDocument();
      expect(screen.getByText("الصفحة 1 من 1")).toBeInTheDocument();
    });

    it("shows book titles in Arabic where available", async () => {
      renderLibraryPage();
      expect(await screen.findByText("الكتاب الأول")).toBeInTheDocument();
      // Ohne arabischen Titel bleibt der deutsche stehen
      expect(screen.getByText("Zweites Buch")).toBeInTheDocument();
    });

    it("puts the Arabic library title in the browser tab", () => {
      renderLibraryPage();
      expect(document.title).toBe(ar.meta.library);
    });
  });
});
