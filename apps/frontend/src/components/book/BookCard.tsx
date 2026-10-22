import { KeyboardEvent } from "react";
import { cn } from "../../utils/cn";

const LANGUAGE_FLAGS: Record<string, string> = {
  de: "🇩🇪",
  ar: "🇸🇦",
  fr: "🇫🇷",
  en: "🇬🇧",
};

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
  // Gratis-Bücher (z.B. Tagesbuch) nie als "€0,00" anzeigen
  const formattedPrice =
    priceSingle === 0
      ? "Gratis"
      : `€${priceSingle.toFixed(2).replace(".", ",")}`;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="article"
      aria-label={`Buch: ${title}`}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer",
        "overflow-hidden flex flex-col",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      )}
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      {/* Cover image area */}
      <div className="relative aspect-[3/4] w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl select-none">📚</span>
        )}

        {/* Daily badge overlay */}
        {isDailyBook && (
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            Täglich
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Title */}
        <p
          className="font-semibold text-sm leading-tight line-clamp-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </p>

        {/* Language badges */}
        <div className="flex gap-1 flex-wrap">
          {languages.map((lang) =>
            LANGUAGE_FLAGS[lang] ? (
              <span
                key={lang}
                className="text-base leading-none"
                aria-label={lang.toUpperCase()}
              >
                {LANGUAGE_FLAGS[lang]}
              </span>
            ) : null,
          )}
        </div>

        {/* Age range + purchase status row */}
        <div className="flex items-center justify-between mt-auto gap-1">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: "var(--color-surface-raised)",
              color: "var(--color-text-secondary)",
            }}
          >
            {ageRange} Jahre
          </span>

          {isPurchased ? (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--color-success)",
                color: "#fff",
              }}
            >
              Gekauft
            </span>
          ) : (
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--color-primary)" }}
            >
              {formattedPrice}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
