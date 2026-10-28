import { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAppLanguage } from "../../hooks/useAppLanguage";
import { formatPrice } from "../../lib/locale";
import { cn } from "../../utils/cn";

interface BookCardProps {
  id: string;
  title: string;
  coverImageUrl?: string;
  theme: string;
  ageRange: string;
  languages: string[];
  isDailyBook?: boolean;
  isPurchased?: boolean;
  priceSingle: number;
  onClick?: () => void;
}

/**
 * Ein Buch im Regal: das quadratische Cover als Buch (gerader Rücken),
 * darunter Titel, Alter und Preis — keine Karten-Hülle drumherum.
 */
export function BookCard({
  title,
  coverImageUrl,
  ageRange,
  languages,
  isDailyBook = false,
  isPurchased,
  priceSingle,
  onClick,
}: BookCardProps) {
  const { t } = useTranslation();
  const lang = useAppLanguage();

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  let price: { text: string; color: string };
  if (isPurchased) {
    price = { text: t("book.purchased"), color: "var(--color-success-text)" };
  } else if (isDailyBook) {
    price = { text: t("book.todayFree"), color: "var(--color-success-text)" };
  } else if (priceSingle === 0) {
    // Gratis-Bücher nie als "0,00 €" anzeigen
    price = { text: t("book.free"), color: "var(--color-success-text)" };
  } else {
    price = {
      text: formatPrice(priceSingle, lang),
      color: "var(--color-text-primary)",
    };
  }

  return (
    <div
      role="article"
      aria-label={t("book.cardLabel", { title })}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group flex flex-col gap-2 cursor-pointer rounded-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-[var(--color-primary-text)]",
      )}
    >
      <div className="relative">
        <div
          className="aspect-square w-full overflow-hidden flex items-center justify-center transition-transform duration-200 group-hover:-translate-y-1"
          style={{
            borderRadius: "var(--radius-book)",
            boxShadow: "var(--shadow-md)",
            backgroundColor: "var(--color-surface-raised)",
            outline: isDailyBook ? "3px solid var(--color-accent)" : undefined,
            outlineOffset: isDailyBook ? "2px" : undefined,
          }}
        >
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-5xl select-none">📚</span>
          )}
        </div>

        {isDailyBook && (
          <span
            className="absolute -top-2 start-2 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "var(--color-on-accent)",
            }}
          >
            {t("book.today")}
          </span>
        )}
      </div>

      <p
        className="m-0 mt-1 text-[18px] font-bold leading-[1.15] line-clamp-2"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--color-text-primary)",
        }}
      >
        {title}
      </p>

      <div
        className="flex items-baseline justify-between gap-2 text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <span>{t("book.ages", { range: ageRange.replace("-", "–") })}</span>
        <span
          className="font-bold whitespace-nowrap"
          style={{ color: price.color }}
        >
          {price.text}
        </span>
      </div>
      <span
        className="text-[13px]"
        style={{ color: "var(--color-text-muted)" }}
      >
        {t("book.languagesCount", { count: languages.length })}
      </span>
    </div>
  );
}
