import { useId } from "react";
import { useTranslation } from "react-i18next";

interface WithdrawalWaiverProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Kaufversuch ohne Häkchen — Hinweis zeigen */
  showError?: boolean;
}

/**
 * Ausdrückliche Zustimmung zum sofortigen Beginn und Bestätigung, dass das
 * Widerrufsrecht damit erlischt (§ 356 Abs. 5 BGB). Nie vorausgewählt.
 */
export function WithdrawalWaiver({
  checked,
  onChange,
  showError = false,
}: WithdrawalWaiverProps) {
  const { t } = useTranslation();
  const id = useId();
  const errorId = `${id}-error`;
  const invalid = showError && !checked;
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="flex items-start gap-3 text-sm leading-snug cursor-pointer"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--color-primary)]"
        />
        <span>{t("legal.waiver")}</span>
      </label>
      {invalid && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-sm font-medium"
          style={{ color: "var(--color-error-text)" }}
        >
          {t("legal.waiverRequired")}
        </p>
      )}
    </div>
  );
}
