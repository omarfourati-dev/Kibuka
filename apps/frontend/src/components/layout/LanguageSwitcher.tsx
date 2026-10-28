import { useEffect, useId, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUIStore } from "@omarsapp/shared-stores";
import {
  LANGUAGES,
  NATIVE_LANGUAGE_NAMES,
  homePathFor,
  landingPageLanguage,
} from "../../lib/locale";
import type { Language } from "../../lib/rtl";

/**
 * Sprache der App, oben auf jeder Hauptseite. Jede Sprache steht in ihrer
 * eigenen Schrift. Auf einer Sprach-Startseite (/ar, /fr, /en) wechselt
 * auch die URL — sonst setzte DocumentLanguage die alte Sprache zurück.
 */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const history = useHistory();
  const { pathname } = useLocation();
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (next: Language) => {
    setOpen(false);
    if (next === language) return;
    setLanguage(next);
    if (pathname === "/" || landingPageLanguage(pathname)) {
      history.replace(homePathFor(next));
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("nav.languageButton", {
          language: NATIVE_LANGUAGE_NAMES[language],
        })}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-11 px-4 rounded-full border-[1.5px] font-bold text-[15px] transition-colors duration-200 hover:bg-[var(--color-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-text)]"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text-primary)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="opacity-70"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
        </svg>
        <span lang={language}>{NATIVE_LANGUAGE_NAMES[language]}</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("nav.languageMenu")}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          className="absolute end-0 top-full mt-2 z-30 min-w-44 rounded-2xl border p-1.5"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "0 18px 32px -18px rgba(30, 39, 71, 0.45)",
          }}
        >
          {LANGUAGES.map((lang) => {
            const active = lang === language;
            return (
              <button
                key={lang}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                lang={lang}
                dir={lang === "ar" ? "rtl" : "ltr"}
                onClick={() => choose(lang)}
                className="flex w-full items-center h-11 px-3 rounded-xl text-start font-bold text-[16px] transition-colors duration-150 hover:bg-[var(--color-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-text)]"
                style={{
                  color: active
                    ? "var(--color-primary-text)"
                    : "var(--color-text-primary)",
                  backgroundColor: active
                    ? "var(--color-primary-soft)"
                    : "transparent",
                }}
              >
                {NATIVE_LANGUAGE_NAMES[lang]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
