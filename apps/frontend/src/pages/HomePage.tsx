import { useState, useEffect, useMemo } from "react";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IonContent, IonPage } from "@ionic/react";
import { getAuthHeaders } from "@omarsapp/shared-stores";
import { BookHero } from "../components/book/BookHero";
import { BookCard } from "../components/book/BookCard";
import { LegalFooter } from "../components/legal/LegalFooter";
import { TopNav } from "../components/layout/TopNav";
import { useAppLanguage } from "../hooks/useAppLanguage";
import { useIsSubscriber } from "../hooks/useIsSubscriber";
import { usePageTitle } from "../hooks/usePageTitle";
import { dayLabel, formatToday, pickTitle } from "../lib/locale";

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

export default function HomePage() {
  const history = useHistory();
  const { t } = useTranslation();
  // /ar, /fr, /en setzen die App-Sprache (DocumentLanguage) — Buchtitel folgen ihr
  const lang = useAppLanguage();
  usePageTitle(t("meta.home"));
  // Abo-Band nur für Familien ohne Abo — solange der Status lädt, gar nicht
  // (kein kurzes Aufblitzen für Abonnenten)
  const isSubscriber = useIsSubscriber();

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

  // Regal "Diese Woche": Bücher der letzten 7 Tage, neuestes zuerst; der
  // Rest steht unter "Alle Bücher" — nichts doppelt
  const { shelf, rest } = useMemo(() => {
    const now = Date.now();
    const all = [...(dailyBook ? [dailyBook] : []), ...books].filter(
      (b, i, list) => list.findIndex((x) => x.id === b.id) === i,
    );
    // Das Buch des Tages steht immer vorn ("Heute"), auch wenn es schon
    // früher erschienen ist; danach die übrigen der Woche, neuestes zuerst
    const recent = all
      .filter(
        (b) =>
          b.id === dailyBook?.id ||
          now - new Date(b.published_at).getTime() < 7 * 86_400_000,
      )
      .sort((a, b) =>
        a.id === dailyBook?.id
          ? -1
          : b.id === dailyBook?.id
            ? 1
            : b.published_at.localeCompare(a.published_at),
      );
    const shelfIds = new Set(recent.map((b) => b.id));
    return {
      shelf: recent,
      rest: books.filter((b) => !shelfIds.has(b.id)),
    };
  }, [dailyBook, books]);

  const openBook = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    history.push(`/books/${id}`);
  };

  let body: React.ReactNode;

  if (loading) {
    body = (
      <div
        role="status"
        aria-label={t("home.loading")}
        className="flex flex-col lg:flex-row gap-8 lg:gap-14 px-5 lg:px-8 py-6 max-w-6xl mx-auto"
      >
        <div
          className="self-center w-full max-w-[300px] lg:max-w-[440px] aspect-square rounded-xl animate-pulse"
          style={{ backgroundColor: "var(--color-surface-raised)" }}
        />
        <div className="flex flex-col gap-4 flex-1">
          {[70, 50, 45, 55].map((w, i) => (
            <div
              key={i}
              className="h-6 rounded-full animate-pulse"
              style={{
                width: `${w}%`,
                backgroundColor: "var(--color-surface-raised)",
              }}
            />
          ))}
        </div>
      </div>
    );
  } else if (loadError) {
    body = (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <span className="text-5xl select-none" aria-hidden="true">
          🙈
        </span>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {t("states.errorTitle")}
        </h1>
        <p
          className="max-w-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {t("home.errorText")}
        </p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="h-12 px-6 rounded-2xl font-bold transition-colors duration-200 hover:bg-[var(--color-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-text)]"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
        >
          {t("states.retry")}
        </button>
      </div>
    );
  } else if (!hasContent) {
    body = (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <span className="text-5xl select-none" aria-hidden="true">
          📚
        </span>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {t("home.emptyTitle")}
        </h1>
        <p style={{ color: "var(--color-text-secondary)" }}>
          {t("home.emptyText")}
        </p>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-12 lg:gap-16 px-5 lg:px-8 pt-2 lg:pt-10 pb-10 max-w-6xl mx-auto">
        {dailyBook && (
          <div className="flex flex-col gap-4">
            <p
              className="m-0 text-[15px] lg:text-[17px]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {formatToday(new Date(), lang)}
            </p>
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
              isDaily
              titles={dailyBook.titles}
              meta={t("book.meta", {
                ages: t("book.ages", {
                  range: dailyBook.age_range.replace("-", "–"),
                }),
                pages: t("book.pages", { count: dailyBook.page_count }),
              })}
              isPurchased={dailyBook.is_purchased ?? false}
              // Buch des Tages ist heute gratis (mit Familienkonto): direkt in
              // den Reader — ohne Konto fängt der Reader per Login ab
              onRead={() => history.push(`/books/${dailyBook.id}/read`)}
              onPreview={() => history.push(`/books/${dailyBook.id}`)}
            />
          </div>
        )}

        {shelf.length > 0 && (
          <section aria-labelledby="home-week" className="flex flex-col gap-4">
            <h2
              id="home-week"
              className="text-[24px] lg:text-[32px] font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t("home.thisWeek")}
            </h2>
            <div className="flex flex-col">
              <div className="relative z-10 flex gap-4 lg:gap-6 overflow-x-auto px-1 -mx-1 pt-1">
                {shelf.map((book) => {
                  const isToday = book.id === dailyBook?.id;
                  return (
                    <a
                      key={book.id}
                      href={`/books/${book.id}`}
                      onClick={openBook(book.id)}
                      className="shrink-0 flex flex-col w-28 lg:w-44 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-[var(--color-primary-text)]"
                    >
                      <span
                        className="block aspect-square w-full overflow-hidden"
                        style={{
                          borderRadius: "var(--radius-book)",
                          boxShadow: "var(--shadow-md)",
                          backgroundColor: "var(--color-surface-raised)",
                          outline: isToday
                            ? "3px solid var(--color-accent)"
                            : undefined,
                          outlineOffset: "2px",
                        }}
                      >
                        {book.cover_image_url && (
                          <img
                            src={book.cover_image_url}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </span>
                      {/* Regalbrett direkt unter jedem Buch — läuft durch */}
                      <span
                        aria-hidden="true"
                        className="block h-2.5 -mx-2 lg:-mx-3"
                        style={{ backgroundColor: "var(--color-shelf)" }}
                      />
                      <span
                        className="pt-2 text-sm font-bold"
                        style={{
                          color: isToday
                            ? "var(--color-text-primary)"
                            : "var(--color-text-secondary)",
                        }}
                      >
                        {isToday
                          ? t("book.today")
                          : dayLabel(book.published_at, lang)}
                      </span>
                      <span className="sr-only">
                        {pickTitle(book.titles, lang)}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section aria-labelledby="home-all" className="flex flex-col gap-4">
            <h2
              id="home-all"
              className="text-[24px] lg:text-[32px] font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t("home.allBooks")}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6 lg:gap-x-6 lg:gap-y-8">
              {rest.map((book) => (
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

        {/* Abo-Band: bewusst in den Nacht-Farben, in beiden Modi gleich */}
        {isSubscriber === false && (
          <section
            aria-labelledby="home-subscribe"
            className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-12 rounded-[28px] p-6 lg:px-11 lg:py-10"
            style={{ backgroundColor: "#1e2747", color: "#eef1fa" }}
          >
            <div className="flex flex-col gap-2.5 flex-1">
              <h2
                id="home-subscribe"
                className="text-[22px] lg:text-[32px] font-bold leading-tight"
              >
                {t("home.subscribeTitle")}
              </h2>
              <p
                className="m-0 text-base lg:text-lg leading-relaxed"
                style={{ color: "#c7cde4" }}
              >
                {t("home.subscribeText")}
              </p>
            </div>
            <a
              href="/pricing"
              onClick={(e) => {
                e.preventDefault();
                history.push("/pricing");
              }}
              className="self-start lg:self-center inline-flex items-center h-12 lg:h-14 px-6 rounded-2xl font-bold text-base lg:text-lg transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e2747] focus-visible:ring-[#f2b632]"
              style={{ backgroundColor: "#f2b632", color: "#1e2747" }}
            >
              {t("home.subscribeCta")}
            </a>
          </section>
        )}
      </div>
    );
  }

  return (
    <IonPage>
      <IonContent>
        <TopNav />
        {body}
        <LegalFooter />
      </IonContent>
    </IonPage>
  );
}
