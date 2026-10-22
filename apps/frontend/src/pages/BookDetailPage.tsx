import { useState, useEffect } from "react";
import { useParams, useHistory, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IonContent, IonPage } from "@ionic/react";
import { getAuthHeaders } from "@omarsapp/shared-stores";
import { BookPreview } from "../components/book/BookPreview";
import { LanguagePicker } from "../components/reader/LanguagePicker";
import { LegalFooter } from "../components/legal/LegalFooter";
import { WithdrawalWaiver } from "../components/legal/WithdrawalWaiver";
import { useAppLanguage } from "../hooks/useAppLanguage";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatPrice } from "../lib/locale";

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
  preview_pages: BookPage[];
  is_purchased: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

const MAX_WEBHOOK_POLLS = 10;

export default function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();
  const appLanguage = useAppLanguage();

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Das Buch öffnet in der App-Sprache; der LanguagePicker wechselt nur das Buch
  const [selectedLanguage, setSelectedLanguage] = useState<string>(appLanguage);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [waiverMissing, setWaiverMissing] = useState(false);
  // Rückkehr von Stripe: ?checkout=success|cancel einmalig einlesen …
  const [checkoutStatus] = useState<string | null>(() =>
    new URLSearchParams(location.search).get("checkout"),
  );
  const [pollCount, setPollCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // … und sofort aus der URL entfernen, damit das Banner einen Reload
  // nicht überlebt
  useEffect(() => {
    if (checkoutStatus) {
      history.replace(location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bookId) return;

    let cancelled = false;
    if (reloadKey === 0) setLoading(true);
    setError(null);

    fetch(`/api/v1/books/${bookId}`, { headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json() as Promise<BookDetail>;
      })
      .then((data) => {
        if (!cancelled) setBook(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookId, reloadKey]);

  // Nach checkout=success kommt die Freischaltung asynchron per Webhook —
  // kurz nachladen, bis is_purchased umspringt
  const awaitingWebhook =
    checkoutStatus === "success" &&
    book !== null &&
    !book.is_purchased &&
    pollCount < MAX_WEBHOOK_POLLS;

  useEffect(() => {
    if (!awaitingWebhook) return;
    const timer = setTimeout(() => {
      setPollCount((c) => c + 1);
      setReloadKey((k) => k + 1);
    }, 2000);
    return () => clearTimeout(timer);
  }, [awaitingWebhook, pollCount]);

  const title = book
    ? book.titles[selectedLanguage] ||
      book.titles.de ||
      Object.values(book.titles).find(Boolean) ||
      ""
    : "";
  usePageTitle(title ? t("meta.book", { title }) : t("meta.bookFallback"));

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div
            role="status"
            aria-label={t("bookDetail.loading")}
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
              {t("bookDetail.loadError")}
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
              {t("bookDetail.toLibrary")}
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const handlePurchase = async () => {
    setPurchaseError(null);
    // Widerrufsverzicht (§ 356 Abs. 5 BGB) muss aktiv bestätigt sein
    if (!waiverAccepted) {
      setWaiverMissing(true);
      return;
    }
    setPurchasing(true);
    try {
      const res = await fetch("/api/v1/billing/checkout/book", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ book_id: book.id, withdrawal_waiver: true }),
      });
      if (res.status === 401) {
        history.push(
          `/login?redirect=${encodeURIComponent(`/books/${book.id}`)}`,
        );
        return;
      }
      if (!res.ok) {
        setPurchaseError(t("bookDetail.buyUnavailable"));
        setPurchasing(false);
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) {
        setPurchaseError(t("bookDetail.buyUnavailable"));
        setPurchasing(false);
        return;
      }
      // purchasing bleibt true — die Seite verlässt uns gleich Richtung Stripe
      window.location.assign(data.url);
    } catch {
      setPurchaseError(t("bookDetail.buyUnavailable"));
      setPurchasing(false);
    }
  };

  const availableLanguages = Object.keys(book.titles).filter(
    (k) => book.titles[k],
  );

  const previewPages = (book.preview_pages ?? []).map((p) => ({
    pageNumber: p.page_number,
    text: p.texts[selectedLanguage] || p.texts.de || "",
    illustrationUrl: p.illustration_url ?? undefined,
  }));

  // Das Tagesbuch (bzw. ein Buch ohne Preis) ist gratis lesbar — kein Kauf-CTA
  const isFree = book.is_daily_book || book.price_single === 0;
  const buyLabel = t("bookDetail.buy", {
    price: formatPrice(book.price_single, appLanguage),
  });

  return (
    <IonPage>
      <IonContent>
        <div className="flex flex-col gap-8 p-6 max-w-3xl mx-auto">
          {/* Back button */}
          <button
            type="button"
            aria-label={t("bookDetail.backLabel")}
            onClick={() => history.push("/library")}
            className="self-start flex items-center gap-1 text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t("bookDetail.back")}
          </button>

          {/* Rückkehr von Stripe: klares Feedback statt stummem Kauf-Button */}
          {checkoutStatus === "success" && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-2xl px-5 py-4 font-semibold"
              style={{
                backgroundColor: "rgba(78, 205, 196, 0.15)",
                color: "var(--color-text-primary)",
                border: "2px solid #4ECDC4",
              }}
            >
              <span className="text-2xl select-none" aria-hidden="true">
                🎉
              </span>
              <span>
                {t("bookDetail.purchaseSuccess")}{" "}
                {book.is_purchased
                  ? t("bookDetail.enjoy")
                  : t("bookDetail.unlocking")}
              </span>
            </div>
          )}
          {checkoutStatus === "cancel" && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-2xl px-5 py-4 font-medium"
              style={{
                backgroundColor: "rgba(255, 217, 61, 0.18)",
                color: "var(--color-text-primary)",
                border: "2px solid #FFD93D",
              }}
            >
              <span className="text-2xl select-none" aria-hidden="true">
                ℹ️
              </span>
              <span>{t("bookDetail.cancelled")}</span>
            </div>
          )}

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
                  {t("book.ages", { range: book.age_range })}
                </span>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: "var(--color-surface-raised)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {t("book.pages", { count: book.page_count })}
                </span>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium capitalize"
                  style={{
                    backgroundColor: "var(--color-surface-raised)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {t(`themes.${book.theme}`, { defaultValue: book.theme })}
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
                {book.is_purchased || isFree ? (
                  <button
                    type="button"
                    aria-label={
                      isFree && !book.is_purchased
                        ? t("bookDetail.readFree")
                        : t("bookDetail.readLabel")
                    }
                    onClick={() =>
                      history.push(
                        `/books/${book.id}/read?language=${selectedLanguage}`,
                      )
                    }
                    className="px-6 py-3 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    {isFree && !book.is_purchased
                      ? t("bookDetail.readFree")
                      : t("bookDetail.readNow")}
                  </button>
                ) : checkoutStatus === "success" ? (
                  <div
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold"
                    style={{
                      backgroundColor: "var(--color-surface-raised)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    <span
                      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                      aria-hidden="true"
                    />
                    {t("bookDetail.processing")}
                  </div>
                ) : (
                  <>
                    <WithdrawalWaiver
                      checked={waiverAccepted}
                      onChange={setWaiverAccepted}
                      showError={waiverMissing}
                    />
                    <button
                      type="button"
                      aria-label={
                        purchasing ? t("bookDetail.redirectingLabel") : buyLabel
                      }
                      onClick={handlePurchase}
                      disabled={purchasing}
                      className="px-6 py-3 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:active:scale-100"
                      style={{ backgroundColor: "var(--color-primary)" }}
                    >
                      {purchasing ? t("bookDetail.redirecting") : buyLabel}
                    </button>
                  </>
                )}
                {purchaseError && (
                  <p className="text-sm w-full" style={{ color: "#dc2626" }}>
                    {purchaseError}
                  </p>
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
                {t("bookDetail.preview")}
              </h2>
              <BookPreview pages={previewPages} language={selectedLanguage} />
            </section>
          )}
        </div>
        <LegalFooter />
      </IonContent>
    </IonPage>
  );
}
