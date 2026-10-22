import { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { IonContent, IonPage } from "@ionic/react";
import { getAuthHeaders } from "@omarsapp/shared-stores";
import { BookHero } from "../components/book/BookHero";
import { BookCard } from "../components/book/BookCard";
import { pickTitle } from "../lib/locale";
import type { Language } from "../lib/rtl";

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
  is_purchased?: boolean;
}

interface BooksListResponse {
  items: BookSummary[];
  total: number;
  page: number;
  page_size: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface HomePageProps {
  /** Voreingestellte Sprache der Sprach-Landingpages (/ar, /fr, /en) */
  lang?: Language;
}

export default function HomePage({ lang = "de" }: HomePageProps = {}) {
  const history = useHistory();

  const [dailyBook, setDailyBook] = useState<BookSummary | null>(null);
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    Promise.all([
      fetch("/api/v1/books/daily", { headers: getAuthHeaders() }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/api/v1/books?page=1&page_size=6", {
        headers: getAuthHeaders(),
      }).then((r) => (r.ok ? (r.json() as Promise<BooksListResponse>) : null)),
    ])
      .then(([daily, list]) => {
        if (cancelled) return;
        setDailyBook((daily as BookSummary | null) ?? null);
        setBooks((list as BooksListResponse | null)?.items ?? []);
      })
      .catch(() => {
        // Netzwerkfehler ist KEIN leerer Katalog — eigener Fehlerzustand
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const hasContent = dailyBook !== null || books.length > 0;

  let body: React.ReactNode;

  if (loading) {
    body = (
      <div
        role="status"
        aria-label="Lade Startseite..."
        className="flex flex-col gap-10 p-6 max-w-4xl mx-auto"
      >
        {/* Hero skeleton */}
        <div
          className="rounded-2xl h-64 animate-pulse"
          style={{ backgroundColor: "var(--color-surface-raised)" }}
        />
        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl aspect-[3/4] animate-pulse"
              style={{ backgroundColor: "var(--color-surface-raised)" }}
            />
          ))}
        </div>
      </div>
    );
  } else if (loadError) {
    body = (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <span className="text-5xl select-none">🙈</span>
        <p
          className="text-lg font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Etwas ist schiefgelaufen
        </p>
        <p
          className="text-sm text-center"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Die Bücher konnten nicht geladen werden. Prüfe deine Verbindung und
          versuche es noch einmal.
        </p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="px-5 py-2.5 rounded-xl font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          Erneut versuchen
        </button>
      </div>
    );
  } else if (!hasContent) {
    body = (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <span className="text-5xl select-none">📚</span>
        <p
          className="text-lg font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Keine Bücher verfügbar
        </p>
        <p
          className="text-sm text-center"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Schau bald wieder vorbei — neue Bücher erscheinen täglich!
        </p>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-10 p-6 max-w-4xl mx-auto">
        {/* Daily book hero */}
        {dailyBook && (
          <BookHero
            book={{
              id: dailyBook.id,
              title: pickTitle(dailyBook.titles, lang),
              coverImageUrl: dailyBook.cover_image_url ?? undefined,
              theme: dailyBook.theme,
              ageRange: dailyBook.age_range,
              languages: Object.keys(dailyBook.titles).filter(
                (k) => dailyBook.titles[k],
              ),
              priceSingle: dailyBook.price_single,
            }}
            isPurchased={dailyBook.is_purchased ?? false}
            // Gratis/gekauft → direkt in den Reader; sonst zur Detailseite
            onRead={() =>
              history.push(
                dailyBook.price_single === 0 || dailyBook.is_purchased
                  ? `/books/${dailyBook.id}/read`
                  : `/books/${dailyBook.id}`,
              )
            }
            onPurchase={() => history.push(`/books/${dailyBook.id}`)}
            onPreview={() => history.push(`/books/${dailyBook.id}`)}
          />
        )}

        {/* Book grid */}
        {books.length > 0 && (
          <section>
            <h2
              className="text-xl font-bold mb-4"
              style={{ color: "var(--color-text-primary)" }}
            >
              Alle Bücher
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  id={book.id}
                  title={pickTitle(book.titles, lang)}
                  coverImageUrl={book.cover_image_url ?? undefined}
                  theme={book.theme}
                  ageRange={book.age_range}
                  languages={Object.keys(book.titles).filter(
                    (k) => book.titles[k],
                  )}
                  isDailyBook={book.is_daily_book}
                  priceSingle={book.price_single}
                  isPurchased={book.is_purchased ?? false}
                  onClick={() => history.push(`/books/${book.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <IonPage>
      <IonContent>{body}</IonContent>
    </IonPage>
  );
}
