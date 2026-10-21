import { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { IonContent, IonPage } from "@ionic/react";
import { BookCard } from "../components/book/BookCard";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookSummary {
  id: string;
  theme: string;
  age_range: string;
  cover_image_url: string | null;
  is_daily_book: boolean;
  published_at: string;
  page_count: number;
  price_single: number;
  titles: Record<string, string>;
}

interface BooksListResponse {
  items: BookSummary[];
  total: number;
  page: number;
  page_size: number;
}

const LANGUAGE_OPTIONS = [
  { value: "", label: "Alle Sprachen" },
  { value: "de", label: "Deutsch" },
  { value: "ar", label: "Arabisch" },
  { value: "fr", label: "Französisch" },
  { value: "en", label: "Englisch" },
];

const AGE_OPTIONS = [
  { value: "", label: "Alle Altersgruppen" },
  { value: "3-5", label: "3–5 Jahre" },
  { value: "6-8", label: "6–8 Jahre" },
  { value: "9-12", label: "9–12 Jahre" },
];

const THEME_OPTIONS = [
  { value: "", label: "Alle Themen" },
  { value: "adventure", label: "Abenteuer" },
  { value: "animals", label: "Tiere" },
  { value: "nature", label: "Natur" },
  { value: "family", label: "Familie" },
  { value: "fantasy", label: "Fantasie" },
];

const PAGE_SIZE = 12;

// ─── Component ───────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const history = useHistory();

  const [books, setBooks] = useState<BookSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [language, setLanguage] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [theme, setTheme] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (language) params.set("language", language);
    if (ageRange) params.set("age_range", ageRange);
    if (theme) params.set("theme", theme);

    fetch(`/api/v1/books?${params.toString()}`)
      .then((r) => (r.ok ? (r.json() as Promise<BooksListResponse>) : null))
      .then((data) => {
        if (cancelled) return;
        setBooks(data?.items ?? []);
        setTotal(data?.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setBooks([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, language, ageRange, theme]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <IonPage>
      <IonContent>
        <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
          {/* Page heading */}
          <h1
            className="text-2xl font-extrabold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Bibliothek
          </h1>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex flex-col gap-1">
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Sprache
              </span>
              <select
                aria-label="Sprache"
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                {LANGUAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Alter
              </span>
              <select
                aria-label="Alter"
                value={ageRange}
                onChange={(e) => {
                  setAgeRange(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                {AGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Thema
              </span>
              <select
                aria-label="Thema"
                value={theme}
                onChange={(e) => {
                  setTheme(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                {THEME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Book grid */}
          {loading ? (
            <div
              role="status"
              aria-label="Lade Bücher..."
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            >
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl aspect-[3/4] animate-pulse"
                  style={{ backgroundColor: "var(--color-surface-raised)" }}
                />
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
              <span className="text-5xl select-none">📚</span>
              <p
                className="text-lg font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Keine Bücher gefunden
              </p>
              <p
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Versuche andere Filteroptionen.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  id={book.id}
                  title={book.titles.de ?? Object.values(book.titles)[0] ?? ""}
                  coverImageUrl={book.cover_image_url ?? undefined}
                  theme={book.theme}
                  ageRange={book.age_range}
                  languages={Object.keys(book.titles).filter(
                    (k) => book.titles[k],
                  )}
                  isDailyBook={book.is_daily_book}
                  priceSingle={book.price_single}
                  onClick={() => history.push(`/books/${book.id}`)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-2">
            <button
              type="button"
              aria-label="Zurück"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-30 hover:opacity-80"
              style={{
                backgroundColor: "var(--color-surface-raised)",
                color: "var(--color-text-primary)",
              }}
            >
              ◀ Zurück
            </button>

            <span
              className="text-sm tabular-nums"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Seite {page} / {totalPages}
            </span>

            <button
              type="button"
              aria-label="Weiter"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-30 hover:opacity-80"
              style={{
                backgroundColor: "var(--color-surface-raised)",
                color: "var(--color-text-primary)",
              }}
            >
              Weiter ▶
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
