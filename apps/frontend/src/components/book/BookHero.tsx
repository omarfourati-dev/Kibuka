import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useAppLanguage } from "../../hooks/useAppLanguage";
import { NATIVE_LANGUAGE_NAMES, formatPrice } from "../../lib/locale";
import type { Language } from "../../lib/rtl";

const TITLE_ORDER: readonly Language[] = ["de", "en", "fr", "ar"];

interface BookHeroBook {
  id: string;
  title: string;
  coverImageUrl?: string;
  theme: string;
  ageRange: string;
  languages: string[];
  priceSingle: number;
}

interface BookHeroProps {
  book: BookHeroBook;
  onRead?: () => void;
  onPurchase?: () => void;
  onPreview?: () => void;
  isPurchased?: boolean;
  /** Buch des Tages: heute gratis, egal welcher Einzelpreis hinterlegt ist */
  isDaily?: boolean;
  /** Titel in allen Sprachen — die übrigen stehen unter der Überschrift */
  titles?: Partial<Record<string, string>>;
  /** Kurzinfo unter den Titeln, z. B. "Für 5–8 Jahre, 10 Seiten" */
  meta?: string;
  selectedLanguage?: string;
}

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2.5 h-14 px-7 rounded-2xl font-bold text-[18px] transition-all duration-200 hover:bg-[var(--color-primary-dark)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-text)]";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2.5 h-13 min-h-[52px] px-6 rounded-2xl font-bold text-[17px] border-2 transition-colors duration-200 hover:bg-[var(--color-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-text)]";

export function BookHero({
  book,
  onRead,
  onPurchase,
  onPreview,
  isPurchased = false,
  isDaily = false,
  titles,
  meta,
}: BookHeroProps) {
  const { t } = useTranslation();
  const lang = useAppLanguage();
  const headingId = useId();
  const formattedPrice = formatPrice(book.priceSingle, lang);
  // Gratis/Tagesbuch: lesen statt kaufen — niemals "0,00 € kaufen"
  const isFree = isDaily || book.priceSingle === 0;
  // Lateinische Schriften zuerst, Arabisch (andere Leserichtung) zuletzt
  const otherTitles = TITLE_ORDER.filter(
    (l) => l !== lang && titles?.[l] && titles[l] !== book.title,
  );

  const primaryLabel = isPurchased
    ? t("hero.readNow")
    : isDaily
      ? t("hero.readToday")
      : t("hero.readFree");

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col lg:flex-row gap-7 lg:gap-14 lg:items-center"
    >
      {/* Das Cover als Buch: quadratisch wie die Illustrationen, mit Rücken */}
      <div className="relative self-center w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[440px] shrink-0">
        <div
          className="relative aspect-square overflow-hidden flex items-center justify-center"
          style={{
            borderRadius: "var(--radius-book)",
            boxShadow: "var(--shadow-lg)",
            backgroundColor: "var(--color-surface-raised)",
          }}
        >
          {book.coverImageUrl ? (
            <img
              src={book.coverImageUrl}
              alt={t("hero.cover", { title: book.title })}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-7xl select-none">📚</span>
          )}
        </div>
        <span
          aria-hidden="true"
          className="absolute inset-y-0 start-0 w-3 pointer-events-none"
          style={{
            backgroundColor: "rgba(30, 39, 71, 0.16)",
            borderInlineEnd: "1px solid rgba(255, 255, 255, 0.45)",
            borderStartStartRadius: "4px",
            borderEndStartRadius: "4px",
          }}
        />
        <span
          className="absolute -top-3 -end-2.5 px-3.5 py-2 rounded-full text-[15px] font-bold"
          style={{
            backgroundColor: "var(--color-accent)",
            color: "var(--color-on-accent)",
            boxShadow: "0 6px 14px -8px rgba(30, 39, 71, 0.5)",
          }}
        >
          {isDaily ? t("hero.badgeToday") : t("hero.badge")}
        </span>
      </div>

      <div className="flex flex-col gap-5 flex-1 min-w-0">
        <div className="flex flex-col gap-3">
          <h1
            id={headingId}
            className="text-[34px] lg:text-[56px] font-extrabold leading-[1.05] lg:leading-none"
            style={{ color: "var(--color-text-primary)" }}
          >
            {book.title}
          </h1>

          {otherTitles.length > 0 ? (
            // Eine Geschichte, vier Sprachen — jede in ihrer eigenen Schrift
            <dl
              aria-label={t("hero.otherTitles")}
              className="grid grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[90px_minmax(0,1fr)] gap-x-3 gap-y-1.5 items-baseline m-0"
            >
              {otherTitles.map((l) => (
                <div key={l} className="contents">
                  <dt
                    lang={l}
                    className="text-[13px] lg:text-[15px]"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {NATIVE_LANGUAGE_NAMES[l]}
                  </dt>
                  <dd
                    lang={l}
                    dir={l === "ar" ? "rtl" : "ltr"}
                    className="m-0 text-[18px] lg:text-[24px] font-medium leading-snug"
                    style={{
                      fontFamily:
                        l === "ar"
                          ? '"Baloo Bhaijaan 2", var(--font-display)'
                          : '"Baloo 2", var(--font-display)',
                      color: "var(--color-text-primary)",
                      // Alle Titel an derselben Kante wie die Seite —
                      // sonst springt Arabisch an den anderen Rand
                      textAlign: lang === "ar" ? "right" : "left",
                    }}
                  >
                    {titles?.[l]}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p
              aria-label={t("hero.languagesLabel")}
              className="flex gap-2 flex-wrap m-0"
            >
              {book.languages.map((l) => (
                <span
                  key={l}
                  className="px-3 py-1 rounded-full text-sm font-bold border-[1.5px] select-none"
                  style={{
                    color: "var(--color-text-secondary)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  {l.toUpperCase()}
                </span>
              ))}
            </p>
          )}

          {meta && (
            <p
              className="m-0 text-[15px] lg:text-[17px]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {meta}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          {isPurchased || isFree ? (
            <button
              type="button"
              onClick={onRead}
              className={PRIMARY_BUTTON}
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-on-primary)",
                boxShadow: "0 10px 20px -12px rgba(51, 67, 168, 0.8)",
              }}
            >
              <BookIcon />
              {primaryLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={onPurchase}
              aria-label={t("hero.buy", { price: formattedPrice })}
              className={PRIMARY_BUTTON}
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-on-primary)",
              }}
            >
              {t("hero.buy", { price: formattedPrice })}
            </button>
          )}

          <button
            type="button"
            onClick={onPreview ?? onRead}
            className={SECONDARY_BUTTON}
            style={{
              borderColor: "var(--color-primary)",
              color: "var(--color-primary-text)",
            }}
          >
            {t("hero.preview")}
          </button>
        </div>
      </div>
    </section>
  );
}

function BookIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 5.5c3-1.3 6-1.3 9 .7 3-2 6-2 9-.7v13c-3-1.3-6-1.3-9 .7-3-2-6-2-9-.7z" />
      <path d="M12 6.2v13.2" />
    </svg>
  );
}
