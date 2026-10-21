import { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import { IonContent, IonPage } from "@ionic/react";
import { BookPreview } from "../components/book/BookPreview";
import { LanguagePicker } from "../components/reader/LanguagePicker";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookPage {
  page_number: number;
  texts: Record<string, string>;
  illustration_url: string | null;
  audio_urls: Record<string, string>;
  word_timestamps: Record<string, unknown[]>;
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
  is_purchased: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const history = useHistory();

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("de");

  useEffect(() => {
    if (!bookId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/v1/books/${bookId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json() as Promise<BookDetail>;
      })
      .then((data) => {
        if (!cancelled) setBook(data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Fehler beim Laden");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div
            role="status"
            aria-label="Lade Buch..."
            className="flex flex-col gap-6 p-6 max-w-3xl mx-auto animate-pulse"
          >
            <div
              className="h-6 rounded w-1/4"
              style={{ backgroundColor: "var(--color-surface-raised)" }}
            />
            <div className="flex gap-6">
              <div
                className="flex-shrink-0 w-48 aspect-[3/4] rounded-xl"
                style={{ backgroundColor: "var(--color-surface-raised)" }}
              />
              <div className="flex flex-col gap-3 flex-1">
                <div
                  className="h-8 rounded w-3/4"
                  style={{ backgroundColor: "var(--color-surface-raised)" }}
                />
                <div
                  className="h-4 rounded w-1/2"
                  style={{ backgroundColor: "var(--color-surface-raised)" }}
                />
                <div
                  className="h-10 rounded w-32 mt-auto"
                  style={{ backgroundColor: "var(--color-surface-raised)" }}
                />
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
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
            <p
              className="text-lg font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Fehler beim Laden
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {error}
            </p>
            <button
              type="button"
              onClick={() => history.push("/library")}
              className="px-4 py-2 rounded-lg font-medium text-white"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              Zur Bibliothek
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const title =
    book.titles[selectedLanguage] ??
    book.titles.de ??
    Object.values(book.titles)[0] ??
    "";

  const availableLanguages = Object.keys(book.titles).filter(
    (k) => book.titles[k],
  );

  const previewPages = book.pages.slice(0, 2).map((p) => ({
    pageNumber: p.page_number,
    text: p.texts[selectedLanguage] ?? p.texts.de ?? "",
    illustrationUrl: p.illustration_url ?? undefined,
  }));

  const formattedPrice = `€${book.price_single.toFixed(2).replace(".", ",")} kaufen`;

  return (
    <IonPage>
      <IonContent>
        <div className="flex flex-col gap-8 p-6 max-w-3xl mx-auto">
          {/* Back button */}
          <button
            type="button"
            aria-label="Zurück zur Bibliothek"
            onClick={() => history.push("/library")}
            className="self-start flex items-center gap-1 text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-text-secondary)" }}
          >
            ← Zurück
          </button>

          {/* Hero section */}
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Cover */}
            <div className="flex-shrink-0 w-full sm:w-48 aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              {book.cover_image_url ? (
                <img
                  src={book.cover_image_url}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl select-none">📚</span>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-col gap-4 flex-1">
              <h1
                className="text-2xl sm:text-3xl font-extrabold leading-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                {title}
              </h1>

              <div className="flex gap-2 flex-wrap">
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: "var(--color-surface-raised)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {book.age_range} Jahre
                </span>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: "var(--color-surface-raised)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {book.page_count} Seiten
                </span>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium capitalize"
                  style={{
                    backgroundColor: "var(--color-surface-raised)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {book.theme}
                </span>
              </div>

              {/* Language picker */}
              <LanguagePicker
                availableLanguages={availableLanguages}
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
              />

              {/* CTA */}
              <div className="mt-auto flex gap-3 flex-wrap">
                {book.is_purchased ? (
                  <button
                    type="button"
                    aria-label="Buch lesen"
                    onClick={() =>
                      history.push(
                        `/books/${book.id}/read?language=${selectedLanguage}`,
                      )
                    }
                    className="px-6 py-3 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    Jetzt lesen
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={formattedPrice}
                    className="px-6 py-3 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    {formattedPrice}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          {previewPages.length > 0 && (
            <section>
              <h2
                className="text-lg font-bold mb-4"
                style={{ color: "var(--color-text-primary)" }}
              >
                Vorschau
              </h2>
              <BookPreview pages={previewPages} language={selectedLanguage} />
            </section>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
