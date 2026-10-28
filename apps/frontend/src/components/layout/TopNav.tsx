import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppLanguage } from "../../hooks/useAppLanguage";
import { homePathFor, landingPageLanguage } from "../../lib/locale";
import { LanguageSwitcher } from "./LanguageSwitcher";

type Area = "home" | "library" | "pricing" | "profile";

function areaOf(pathname: string): Area | null {
  if (pathname === "/" || landingPageLanguage(pathname)) return "home";
  if (pathname.startsWith("/library") || pathname.startsWith("/books")) {
    return "library";
  }
  if (pathname.startsWith("/pricing")) return "pricing";
  if (pathname.startsWith("/profile")) return "profile";
  return null;
}

/** Sonnen-Marke: Kibuka ist das Buch des Tages. */
export function SunMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="6" fill="var(--color-accent)" />
      <path
        d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Kopf jeder Hauptseite: Marke und Sprachumschalter; ab 1024 px zusätzlich
 * die Navigation, die auf dem Handy die Tableiste unten übernimmt.
 */
export function TopNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const lang = useAppLanguage();
  const current = areaOf(pathname);

  const links: { area: Area; to: string; label: string }[] = [
    { area: "home", to: homePathFor(lang), label: t("tabs.home") },
    { area: "library", to: "/library", label: t("tabs.library") },
    { area: "pricing", to: "/pricing", label: t("tabs.pricing") },
    { area: "profile", to: "/profile", label: t("tabs.profile") },
  ];

  return (
    <header
      className="lg:border-b"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="max-w-6xl mx-auto flex items-center gap-6 px-5 lg:px-8 pt-4 pb-2 lg:py-3">
        <Link
          to={homePathFor(lang)}
          className="flex items-center gap-2 text-[26px] font-extrabold leading-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-text)]"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-text-primary)",
          }}
        >
          <SunMark />
          <span lang="de">Kibuka</span>
        </Link>

        <nav
          aria-label={t("nav.main")}
          className="hidden lg:flex items-center gap-1.5"
        >
          {links.map((link) => {
            const active = link.area === current;
            return (
              <Link
                key={link.area}
                to={link.to}
                aria-current={active ? "page" : undefined}
                className="flex items-center h-11 px-4 rounded-full font-bold text-[16px] transition-colors duration-200 hover:bg-[var(--color-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-text)]"
                style={{
                  color: active
                    ? "var(--color-primary-text)"
                    : "var(--color-text-primary)",
                  backgroundColor: active
                    ? "var(--color-primary-soft)"
                    : undefined,
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
