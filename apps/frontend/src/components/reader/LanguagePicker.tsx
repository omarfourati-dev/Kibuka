import { cn } from "../../utils/cn";

const LANGUAGE_FLAGS: Record<string, string> = {
  de: "🇩🇪",
  ar: "🇸🇦",
  fr: "🇫🇷",
  en: "🇬🇧",
};

interface LanguagePickerProps {
  availableLanguages: string[];
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

export function LanguagePicker({
  availableLanguages,
  selectedLanguage,
  onLanguageChange,
}: LanguagePickerProps) {
  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      role="group"
      aria-label="Language selection"
    >
      {availableLanguages.map((lang) => {
        const isSelected = lang === selectedLanguage;
        const flag = LANGUAGE_FLAGS[lang];

        return (
          <button
            key={lang}
            type="button"
            aria-label={lang.toUpperCase()}
            aria-pressed={isSelected}
            onClick={() => onLanguageChange(lang)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium",
              "transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              isSelected
                ? "bg-[var(--color-primary)] text-white shadow-sm"
                : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:opacity-80",
            )}
          >
            {flag && (
              <span className="text-base leading-none" aria-hidden="true">
                {flag}
              </span>
            )}
            <span className="text-xs uppercase">{lang}</span>
          </button>
        );
      })}
    </div>
  );
}
