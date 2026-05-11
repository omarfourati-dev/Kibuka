import { getActiveWordIndex, splitTextToWords } from "../../lib/audio-sync";
import type { WordTimestamp } from "../../lib/audio-sync";
import { getDir } from "../../lib/rtl";
import type { Language } from "../../lib/rtl";
import { cn } from "../../utils/cn";

const FONT_SIZE_MAP = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
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
      className={cn(
        "leading-relaxed flex flex-wrap gap-x-1 gap-y-0.5",
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
