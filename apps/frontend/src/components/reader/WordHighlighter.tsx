import { getActiveWordIndex, splitTextToWords } from "../../lib/audio-sync";
import type { WordTimestamp } from "../../lib/audio-sync";
import { getDir } from "../../lib/rtl";
import type { Language } from "../../lib/rtl";
import { cn } from "../../utils/cn";

// Lesegröße für Kinderbücher: groß genug zum Vorlesen auf Armlänge
const FONT_SIZE_MAP = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-[19px] lg:text-[21px]",
  xl: "text-[22px] lg:text-[26px]",
};

interface WordHighlighterProps {
  text: string;
  timestamps: WordTimestamp[];
  currentTimeMs: number;
  language: string;
  fontSize?: "sm" | "md" | "lg" | "xl";
}

export function WordHighlighter({
  text,
  timestamps,
  currentTimeMs,
  language,
  fontSize = "md",
}: WordHighlighterProps) {
  const words = splitTextToWords(text);
  const activeIndex = getActiveWordIndex(timestamps, currentTimeMs);

  return (
    <p
      dir={getDir(language as Language)}
      lang={language}
      className={cn(
        "kibuka-reader-text m-0 leading-[1.6] flex flex-wrap gap-x-[0.28em] gap-y-1",
        FONT_SIZE_MAP[fontSize],
      )}
    >
      {words.map(({ word, index }) => {
        const isPast = activeIndex !== -1 && index < activeIndex;
        const isActive = activeIndex !== -1 && index === activeIndex;

        return (
          <span
            key={`${word}-${index}`}
            className={cn(
              "transition-all duration-150",
              isActive && "word-highlight-active",
              isPast && "word-highlight-past",
              !isActive && !isPast && "word-highlight-future",
            )}
          >
            {word}
          </span>
        );
      })}
    </p>
  );
}
