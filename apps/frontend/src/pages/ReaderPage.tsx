import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IonContent, IonPage } from "@ionic/react";
import { getAuthHeaders } from "@omarsapp/shared-stores";
import { AudioPlayer } from "../components/reader/AudioPlayer";
import { WordHighlighter } from "../components/reader/WordHighlighter";
import { LanguagePicker } from "../components/reader/LanguagePicker";
import { DualLanguageView } from "../components/reader/DualLanguageView";
import { useAppLanguage } from "../hooks/useAppLanguage";
import { usePageTitle } from "../hooks/usePageTitle";
import type { WordTimestamp } from "../lib/audio-sync";
import { pickTitle } from "../lib/locale";
import { getDir } from "../lib/rtl";
import type { Language } from "../lib/rtl";
import { cn } from "../utils/cn";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookPage {
  page_number: number;
  texts: Record<string, string>;
  illustration_url: string | null;
  audio_urls: Record<string, string>;
  word_timestamps: Record<string, WordTimestamp[]>;
}

interface BookDetail {
  id: string;
  theme: string;
  age_range: string;
  cover_image_url: string | null;
  is_daily_book: boolean;
  published_at: string;
  page_count: number;
  price_single: number;
  titles: Record<string, string>;
  pages: BookPage[];
}

const SUPPORTED_LANGUAGES = ["de", "ar", "fr", "en"];
const NOT_PLAYING = -1;

function isSupportedLanguage(lang: string): lang is Language {
  return (["de", "ar", "fr", "en"] as const).includes(lang as Language);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const location = useLocation();
  const history = useHistory();
  const { t } = useTranslation();
  const appLanguage = useAppLanguage();

  const searchParams = new URLSearchParams(location.search);
  // Ohne ?language öffnet das Buch in der Sprache der App
  const initialLanguage = searchParams.get("language") ?? appLanguage;
  const initialPage = Number(searchParams.get("page") ?? 0);

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  // -1 = nichts wird vorgelesen; 0 wäre schon das erste Wort
  const [currentTimeMs, setCurrentTimeMs] = useState(NOT_PLAYING);
  const [isDualLanguageMode, setIsDualLanguageMode] = useState(false);

  // ── Fetch book data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/v1/books/${bookId}/read`, { headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            // Keine/abgelaufene Session — einloggen und direkt zurückkommen
            history.push(
              `/login?redirect=${encodeURIComponent(`/books/${bookId}/read`)}`,
            );
            return null;
          }
          if (res.status === 403) {
            history.push(`/books/${bookId}`);
            return null;
          }
          throw new Error(`API ${res.status}`);
        }
        return res.json() as Promise<BookDetail>;
      })
      .then((data) => {
        if (!cancelled && data) {
          setBook(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookId, history]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!book) return;
    setCurrentPage((p) => Math.min(p + 1, book.pages.length - 1));
  }, [book]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  // Die Blätter-Knöpfe spiegeln sich mit der Oberfläche — die Pfeiltasten
  // auch: auf Arabisch blättert ← vorwärts
  const isRtlUi = getDir(appLanguage) === "rtl";
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") (isRtlUi ? goPrev : goNext)();
      if (e.key === "ArrowLeft") (isRtlUi ? goNext : goPrev)();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, isRtlUi]);

  // Neue Seite beginnt oben — auf dem Handy steht man sonst mitten im Text —
  // und ohne Markierung, bis wieder vorgelesen wird
  const contentRef = useRef<HTMLIonContentElement>(null);
  useEffect(() => {
    setCurrentTimeMs(NOT_PLAYING);
    void contentRef.current?.scrollToTop?.(0);
  }, [currentPage, selectedLanguage]);

  // Nächste Illustration vorladen, damit das Umblättern nicht flackert
  useEffect(() => {
    const next = book?.pages[currentPage + 1]?.illustration_url;
    if (next) new Image().src = next;
  }, [book, currentPage]);

  // ── Sync page into URL ───────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams({
      language: selectedLanguage,
      page: String(currentPage),
    });
    history.replace({ search: params.toString() });
  }, [currentPage, selectedLanguage, history]);

  const bookTitle = book
    ? pickTitle(
        book.titles,
        isSupportedLanguage(selectedLanguage) ? selectedLanguage : appLanguage,
      )
    : "";
  usePageTitle(
    bookTitle
      ? t("meta.reader", { title: bookTitle })
      : t("meta.readerFallback"),
  );

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div
            role="status"
            aria-label={t("reader.loading")}
            className="min-h-full flex flex-col"
            style={{ backgroundColor: "var(--color-background)" }}
          >
            <div className="h-14" />
            <div className="animate-pulse w-full max-w-xl lg:max-w-6xl mx-auto px-4 lg:px-8 py-5 lg:py-10">
              <div
                className="overflow-hidden lg:grid lg:grid-cols-2 rounded-[22px]"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <div
                  className="aspect-square"
                  style={{ backgroundColor: "var(--color-surface-raised)" }}
                />
                <div className="flex flex-col gap-3 p-6 lg:p-12 justify-center">
                  {["w-full", "w-11/12", "w-4/5", "w-2/3"].map((w) => (
                    <div
                      key={w}
                      className={`h-5 rounded-full ${w}`}
                      style={{ backgroundColor: "var(--color-surface-raised)" }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (error || !book) {
    return (
      <IonPage>
        <IonContent>
          <div
            className="flex min-h-full flex-col items-center justify-center gap-5 px-6 text-center"
            style={{ backgroundColor: "var(--color-background)" }}
          >
            <span aria-hidden="true" className="text-6xl select-none">
              📖
            </span>
            <p
              className="m-0 text-xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t("reader.loadError")}
            </p>
            <button
              type="button"
              onClick={() => history.push(`/books/${bookId}`)}
              className={PRIMARY_BUTTON}
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-on-primary)",
              }}
            >
              {t("reader.back")}
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const totalPages = book.pages.length;
  const page = book.pages[currentPage];
  const lang = isSupportedLanguage(selectedLanguage) ? selectedLanguage : "de";
  const pageText = page?.texts[selectedLanguage] ?? "";
  const pageTimestamps = page?.word_timestamps[selectedLanguage] ?? [];
  const audioUrl = page?.audio_urls[selectedLanguage] ?? "";
  const availableLanguages = SUPPORTED_LANGUAGES.filter((l) =>
    book.pages.some((p) => p.texts[l]),
  );
  // Daneben die Sprache der Familie (der App), sonst Englisch bzw. Deutsch
  const secondaryLanguage =
    appLanguage !== lang && availableLanguages.includes(appLanguage)
      ? appLanguage
      : lang === "en"
        ? "de"
        : "en";
  const secondaryText = page?.texts[secondaryLanguage] ?? "";
  const isLastPage = currentPage === totalPages - 1;
  const progress = ((currentPage + 1) / totalPages) * 100;
  const closeBook = () => history.push(`/books/${bookId}`);

  return (
    <IonPage>
      <IonContent ref={contentRef}>
        <div
          className="flex flex-col min-h-full"
          style={{ backgroundColor: "var(--color-background)" }}
        >
          {/* Kopf: Schließen, Titel, Seitenzahl — der Reader ist fullscreen
              ohne Tab-Bar, ohne Schließen säße man in der App im Buch fest */}
          <header
            className="sticky top-0 z-10"
            style={{ backgroundColor: "var(--color-background)" }}
          >
            <div className="flex items-center gap-1 h-14 px-2 max-w-6xl mx-auto">
              <button
                type="button"
                aria-label={t("reader.exit")}
                onClick={closeBook}
                className={ICON_BUTTON}
                style={{ color: "var(--color-text-primary)" }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <h1
                lang={lang}
                className="flex-1 min-w-0 m-0 truncate text-[17px] lg:text-xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {bookTitle}
              </h1>
              <span
                dir="ltr"
                className="shrink-0 px-3 text-[15px] font-bold tabular-nums"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {currentPage + 1} / {totalPages}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={totalPages}
              aria-valuenow={currentPage + 1}
              aria-label={t("reader.progress", {
                page: currentPage + 1,
                total: totalPages,
              })}
              className="h-1 w-full"
              style={{ backgroundColor: "var(--color-border)" }}
            >
              <div
                className="h-full transition-[width] duration-300 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: "var(--color-accent)",
                }}
              />
            </div>
          </header>

          <main className="flex-1 w-full max-w-xl lg:max-w-6xl mx-auto px-4 lg:px-8 py-5 lg:py-10 flex flex-col gap-6">
            {/* Die Seite: Bild und Text wie im Buch — am Desktop aufgeschlagen */}
            <article
              className="overflow-hidden lg:grid lg:grid-cols-2 rounded-[22px]"
              style={{
                backgroundColor: "var(--color-surface)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              {page?.illustration_url ? (
                <img
                  src={page.illustration_url}
                  alt={t("book.pageAlt", { page: currentPage + 1 })}
                  className="block w-full aspect-square object-cover"
                />
              ) : (
                <div
                  className="w-full aspect-square flex items-center justify-center"
                  style={{ backgroundColor: "var(--color-surface-raised)" }}
                >
                  <span aria-hidden="true" className="text-6xl select-none">
                    📖
                  </span>
                </div>
              )}

              <div
                lang={lang}
                dir={getDir(lang)}
                className="flex flex-col justify-center p-6 sm:p-8 lg:p-12"
                style={{ color: "var(--color-text-primary)" }}
              >
                {isDualLanguageMode ? (
                  <DualLanguageView
                    primaryLanguage={selectedLanguage}
                    secondaryLanguage={secondaryLanguage}
                    primaryText={pageText}
                    secondaryText={secondaryText}
                    timestamps={pageTimestamps}
                    currentTimeMs={currentTimeMs}
                  />
                ) : (
                  <WordHighlighter
                    text={pageText}
                    timestamps={pageTimestamps}
                    currentTimeMs={currentTimeMs}
                    language={selectedLanguage}
                    fontSize="xl"
                  />
                )}
              </div>
            </article>

            {/* Lesesprache — ändert man selten, darum nicht in der festen Leiste */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <LanguagePicker
                availableLanguages={availableLanguages}
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
              />

              <button
                type="button"
                aria-pressed={isDualLanguageMode}
                onClick={() => setIsDualLanguageMode((v) => !v)}
                className={cn(
                  "self-start sm:self-auto inline-flex items-center gap-2 h-12 px-5 rounded-2xl font-bold text-[16px]",
                  "transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-text)]",
                  isDualLanguageMode
                    ? "border-2 border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-[var(--color-background)]"
                    : "border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]",
                )}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M4 12h10M4 17h16" />
                </svg>
                {t("reader.dualMode")}
              </button>
            </div>
          </main>

          {/* Feste Leiste: blättern und vorlesen, mit dem Daumen erreichbar */}
          <footer
            className="sticky bottom-0 z-10 border-t-[1.5px]"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex items-center gap-3 max-w-6xl mx-auto px-3 lg:px-8 py-3">
              <button
                type="button"
                aria-label={t("reader.prevPage")}
                onClick={goPrev}
                disabled={currentPage === 0}
                className={cn(
                  PAGE_BUTTON,
                  "border-2 border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]",
                )}
              >
                <Chevron back />
              </button>

              <div className="flex-1 min-w-0">
                {audioUrl && (
                  <AudioPlayer
                    // Neue Seite, neuer Player: Position und Play-Status zurück
                    key={audioUrl}
                    audioUrl={audioUrl}
                    language={selectedLanguage}
                    onTimeUpdate={setCurrentTimeMs}
                  />
                )}
              </div>

              {isLastPage ? (
                <button
                  type="button"
                  onClick={closeBook}
                  className={cn(PRIMARY_BUTTON, "shrink-0 h-14")}
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-on-primary)",
                  }}
                >
                  {t("reader.finish")}
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={t("reader.nextPage")}
                  onClick={goNext}
                  className={cn(
                    PAGE_BUTTON,
                    "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-dark)]",
                  )}
                >
                  <Chevron />
                </button>
              )}
            </div>
          </footer>
        </div>
      </IonContent>
    </IonPage>
  );
}

const ICON_BUTTON =
  "shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-[var(--color-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-text)]";

const PAGE_BUTTON =
  "shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-200 active:scale-95 disabled:opacity-35 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-text)]";

const PRIMARY_BUTTON =
  "h-12 px-6 rounded-2xl font-bold text-[17px] transition-colors duration-200 hover:bg-[var(--color-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-text)]";

/** Pfeil vor/zurück — spiegelt sich in RTL mit der Leiste */
function Chevron({ back = false }: { back?: boolean }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="rtl:-scale-x-100"
    >
      <path d={back ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
