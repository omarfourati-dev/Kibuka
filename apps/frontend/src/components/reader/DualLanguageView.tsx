import type { WordTimestamp } from "../../lib/audio-sync";
import { NATIVE_LANGUAGE_NAMES, isLanguage } from "../../lib/locale";
import { getDir } from "../../lib/rtl";
import type { Language } from "../../lib/rtl";
import { WordHighlighter } from "./WordHighlighter";

interface DualLanguageViewProps {
  primaryLanguage: string;
  secondaryLanguage: string;
  primaryText: string;
  secondaryText: string;
  timestamps?: WordTimestamp[];
  currentTimeMs?: number;
}

/**
 * Lesesprache oben (mit Mitlese-Markierung), die zweite Sprache darunter,
 * leiser und mit ihrem Namen — Eltern sehen sofort, welche welche ist.
 */
export function DualLanguageView({
  primaryLanguage,
  secondaryLanguage,
  primaryText,
  secondaryText,
  timestamps,
  currentTimeMs = -1,
}: DualLanguageViewProps) {
  const secondaryName = isLanguage(secondaryLanguage)
    ? NATIVE_LANGUAGE_NAMES[secondaryLanguage]
    : secondaryLanguage;

  return (
    <div className="flex flex-col gap-5">
      <div dir={getDir(primaryLanguage as Language)}>
        <WordHighlighter
          text={primaryText}
          timestamps={timestamps ?? []}
          currentTimeMs={currentTimeMs}
          language={primaryLanguage}
          fontSize="xl"
        />
      </div>

      <div
        dir={getDir(secondaryLanguage as Language)}
        className="flex flex-col gap-1.5 pt-4 border-t-[1.5px] border-[var(--color-border)] text-[var(--color-text-secondary)]"
      >
        <span lang={secondaryLanguage} className="text-sm font-bold">
          {secondaryName}
        </span>
        <WordHighlighter
          text={secondaryText}
          timestamps={[]}
          currentTimeMs={-1}
          language={secondaryLanguage}
          fontSize="lg"
        />
      </div>
    </div>
  );
}
