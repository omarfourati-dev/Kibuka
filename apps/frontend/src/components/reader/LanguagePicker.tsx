import { useTranslation } from "react-i18next";
import { NATIVE_LANGUAGE_NAMES, isLanguage } from "../../lib/locale";
import { cn } from "../../utils/cn";

interface LanguagePickerProps {
  availableLanguages: string[];
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

/**
 * Lesesprache wählen. Jede Sprache steht in ihrer eigenen Schrift — keine
 * Flaggen-Emoji (Windows zeigte statt Flaggen nur "DE DE", "SA AR").
 */
export function LanguagePicker({
  availableLanguages,
  selectedLanguage,
  onLanguageChange,
}: LanguagePickerProps) {
  const { t } = useTranslation();
  return (
    <div
      className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2"
      role="group"
      aria-label={t("picker.label")}
    >
      {availableLanguages.map((lang) => {
        const isSelected = lang === selectedLanguage;
        const name = isLanguage(lang)
          ? NATIVE_LANGUAGE_NAMES[lang]
          : lang.toUpperCase();

        return (
          <button
            key={lang}
            type="button"
            lang={lang}
            aria-pressed={isSelected}
            onClick={() => onLanguageChange(lang)}
            className={cn(
              "h-12 px-5 rounded-2xl font-bold text-[16px]",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-text)]",
              isSelected
                ? "border-2 border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-[var(--color-background)]"
                : "border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]",
            )}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
