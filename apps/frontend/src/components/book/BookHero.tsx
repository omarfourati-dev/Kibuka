import { useTranslation } from "react-i18next";
import { useAppLanguage } from "../../hooks/useAppLanguage";
import { formatPrice } from "../../lib/locale";
import { cn } from "../../utils/cn";

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
  selectedLanguage?: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  de: "DE",
  ar: "AR",
  fr: "FR",
  en: "EN",
};

export function BookHero({
  book,
  onRead,
  onPurchase,
  onPreview,
  isPurchased = false,
  selectedLanguage,
}: BookHeroProps) {
  const { t } = useTranslation();
  const lang = useAppLanguage();
  const formattedPrice = formatPrice(book.priceSingle, lang);
  // Tagesbuch/Gratis-Buch: lesen statt kaufen — niemals "€0,00 kaufen" zeigen
  const isFree = book.priceSingle === 0;

  return (
    <section
      className="flex flex-col md:flex-row gap-6 md:gap-10 p-6 md:p-10 rounded-2xl"
      style={{ backgroundColor: "var(--color-surface-raised)" }}
    >
      {/* Cover image */}
      <div className="flex-shrink-0 w-full md:w-64 aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-7xl select-none">📚</span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 flex-1">
        {/* Daily badge */}
        <span
          className="inline-flex self-start px-3 py-1 rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {t("hero.badge")}
        </span>

        {/* Title */}
        <h1
          className="text-3xl md:text-4xl font-extrabold leading-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          {book.title}
        </h1>

        {/* Verfügbare Sprachen — reine Info-Badges, keine toten Buttons.
            Die Sprachwahl passiert auf der Detailseite bzw. im Reader. */}
        <div
          className="flex gap-2 flex-wrap"
          aria-label={t("hero.languagesLabel")}
        >
          {book.languages.map((lang) => {
            const label = LANGUAGE_LABELS[lang] ?? lang.toUpperCase();
            const isSelected = lang === selectedLanguage;
            return (
              <span
                key={lang}
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-semibold border-2 select-none",
                  isSelected ? "text-white border-transparent" : "",
                )}
                style={
                  isSelected
                    ? {
                        backgroundColor: "var(--color-primary)",
                        borderColor: "var(--color-primary)",
                      }
                    : {
                        color: "var(--color-text-secondary)",
                        borderColor: "var(--color-border)",
                      }
                }
              >
                {label}
              </span>
            );
          })}
        </div>

        {/* CTAs */}
        <div className="flex gap-3 flex-wrap mt-auto">
          {isPurchased || isFree ? (
            <button
              type="button"
              onClick={onRead}
              className="px-6 py-3 rounded-xl font-bold text-white text-base transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {isFree && !isPurchased ? t("hero.readFree") : t("hero.readNow")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onPurchase}
              aria-label={t("hero.buy", { price: formattedPrice })}
              className="px-6 py-3 rounded-xl font-bold text-white text-base transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {t("hero.buy", { price: formattedPrice })}
            </button>
          )}

          <button
            type="button"
            onClick={onPreview ?? onRead}
            className="px-6 py-3 rounded-xl font-bold text-base border-2 transition-all duration-200 hover:opacity-80"
            style={{
              borderColor: "var(--color-primary)",
              color: "var(--color-primary)",
            }}
          >
            {t("hero.preview")}
          </button>
        </div>
      </div>
    </section>
  );
}
