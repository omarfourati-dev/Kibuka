import type { WordTimestamp } from "../../lib/audio-sync";
import { getDir } from "../../lib/rtl";
import type { Language } from "../../lib/rtl";
import { WordHighlighter } from "./WordHighlighter";
import { cn } from "../../utils/cn";

interface DualLanguageViewProps {
  primaryLanguage: string;
  secondaryLanguage: string;
  primaryText: string;
  secondaryText: string;
  timestamps?: WordTimestamp[];
  currentTimeMs?: number;
}

export function DualLanguageView({
  primaryLanguage,
  secondaryLanguage,
  primaryText,
  secondaryText,
  timestamps,
  currentTimeMs = -1,
}: DualLanguageViewProps) {
  const primaryDir = getDir(primaryLanguage as Language);
  const secondaryDir = getDir(secondaryLanguage as Language);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Primary language panel — always uses WordHighlighter for per-word rendering */}
      <div
        dir={primaryDir}
        className={cn(
          "p-4 rounded-xl",
          "bg-[var(--color-surface)]",
          "border border-[var(--color-border)]",
        )}
      >
        <WordHighlighter
          text={primaryText}
          timestamps={timestamps ?? []}
          currentTimeMs={currentTimeMs}
          language={primaryLanguage}
          fontSize="md"
        />
      </div>

      {/* Secondary language panel */}
      <div
        dir={secondaryDir}
        className={cn(
          "p-4 rounded-xl",
          "bg-[var(--color-surface-raised)]",
          "border border-[var(--color-border)]",
        )}
      >
        <WordHighlighter
          text={secondaryText}
          timestamps={[]}
          currentTimeMs={-1}
          language={secondaryLanguage}
          fontSize="md"
        />
      </div>
    </div>
  );
}
