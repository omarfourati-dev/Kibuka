import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { AudioPlayer } from "../components/reader/AudioPlayer";
import { WordHighlighter } from "../components/reader/WordHighlighter";
import { LanguagePicker } from "../components/reader/LanguagePicker";
import { DualLanguageView } from "../components/reader/DualLanguageView";
import type { WordTimestamp } from "../lib/audio-sync";
import { getDir } from "../lib/rtl";
import type { Language } from "../lib/rtl";

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

function isSupportedLanguage(lang: string): lang is Language {
  return (["de", "ar", "fr", "en"] as const).includes(lang as Language);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialLanguage = searchParams.get("language") ?? "de";
  const initialPage = Number(searchParams.get("page") ?? 0);

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isDualLanguageMode, setIsDualLanguageMode] = useState(false);

  // ── Fetch book data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/v1/books/${bookId}/read`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 403) {
            navigate(`/books/${bookId}`);
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
          setError(err instanceof Error ? err.message : "Fehler beim Laden");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookId, navigate]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!book) return;
    setCurrentPage((p) => Math.min(p + 1, book.pages.length - 1));
  }, [book]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  // ── Sync page into URL ───────────────────────────────────────────────────
  useEffect(() => {
    setSearchParams(
      { language: selectedLanguage, page: String(currentPage) },
      { replace: true },
    );
  }, [currentPage, selectedLanguage, setSearchParams]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Lade Buch..."
        className="flex h-screen items-center justify-center"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <div className="animate-pulse flex flex-col gap-4 w-full max-w-xl px-6">
          <div
            className="h-6 rounded w-1/3"
            style={{ backgroundColor: "var(--color-surface-raised)" }}
          />
          <div
            className="aspect-video rounded-xl w-full"
            style={{ backgroundColor: "var(--color-surface-raised)" }}
          />
          <div
            className="h-4 rounded w-full"
            style={{ backgroundColor: "var(--color-surface-raised)" }}
          />
          <div
            className="h-4 rounded w-5/6"
            style={{ backgroundColor: "var(--color-surface-raised)" }}
          />
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6">
        <p
          className="text-lg font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Fehler beim Laden des Buches
        </p>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {error}
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg font-medium text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          Zurück
        </button>
      </div>
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
  const secondaryLanguage = lang === "de" ? "en" : "de";
  const secondaryText = page?.texts[secondaryLanguage] ?? "";

  const progress = ((currentPage + 1) / totalPages) * 100;

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Progress bar */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: "var(--color-surface-raised)" }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            backgroundColor: "var(--color-primary)",
          }}
        />
      </div>

      {/* Main content */}
      <main
        className="flex-1 flex flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full"
        dir={getDir(lang)}
      >
        {/* Illustration */}
        {page?.illustration_url ? (
          <div className="w-full aspect-video rounded-xl overflow-hidden">
            <img
              src={page.illustration_url}
              alt={`Seite ${currentPage + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-full aspect-video rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "var(--color-surface-raised)" }}
          >
            <span className="text-6xl select-none">📖</span>
          </div>
        )}

        {/* Text content */}
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
            fontSize="lg"
          />
        )}
      </main>

      {/* Bottom floating control bar */}
      <footer
        className="sticky bottom-0 px-4 py-3 border-t flex flex-col gap-3"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Navigation row */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Zurück"
            onClick={goPrev}
            disabled={currentPage === 0}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30 hover:opacity-80"
            style={{ backgroundColor: "var(--color-surface-raised)" }}
          >
            ◀
          </button>

          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {currentPage + 1} / {totalPages}
          </span>

          <button
            type="button"
            aria-label="Weiter"
            onClick={goNext}
            disabled={currentPage === totalPages - 1}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30 hover:opacity-80"
            style={{ backgroundColor: "var(--color-surface-raised)" }}
          >
            ▶
          </button>
        </div>

        {/* Secondary controls row */}
        <div className="flex items-center gap-3 flex-wrap justify-between">
          <LanguagePicker
            availableLanguages={availableLanguages}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />

          <button
            type="button"
            aria-pressed={isDualLanguageMode}
            onClick={() => setIsDualLanguageMode((v) => !v)}
            className="px-3 py-1 rounded-lg text-xs font-semibold border-2 transition-all duration-150"
            style={
              isDualLanguageMode
                ? {
                    backgroundColor: "var(--color-primary)",
                    borderColor: "var(--color-primary)",
                    color: "#fff",
                  }
                : {
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-secondary)",
                  }
            }
          >
            A|B
          </button>

          {audioUrl && (
            <AudioPlayer
              audioUrl={audioUrl}
              language={selectedLanguage}
              onTimeUpdate={setCurrentTimeMs}
            />
          )}
        </div>
      </footer>
    </div>
  );
}
