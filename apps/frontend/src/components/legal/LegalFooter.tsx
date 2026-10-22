import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CANCELLATION_PATH, IMPRINT_URL, PRIVACY_URL } from "../../lib/legal";

// text-inherit: Ionic färbt <a> sonst global in der Primärfarbe
const LINK_CLASS =
  "text-inherit hover:underline focus-visible:underline focus-visible:outline-none rounded";

/**
 * Pflichtlinks am Ende jeder Seite: Impressum (§ 5 DDG) unmittelbar
 * erreichbar, Kündigungsbutton (§ 312k BGB) ständig verfügbar.
 */
export function LegalFooter() {
  const { t } = useTranslation();
  return (
    // Explizite Rolle: IonContent hängt den Inhalt in ein <main> im Shadow
    // DOM, dort verliert <footer> sonst seine Landmark-Rolle
    <footer
      role="contentinfo"
      className="mt-12 border-t px-6 py-6"
      style={{
        borderColor: "var(--color-border)",
        color: "var(--color-text-secondary)",
      }}
    >
      <nav
        aria-label={t("legal.nav")}
        className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs"
      >
        <a
          href={IMPRINT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {t("legal.imprint")}
        </a>
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {t("legal.privacy")}
        </a>
        <Link
          to={CANCELLATION_PATH}
          className={`${LINK_CLASS} font-semibold`}
          style={{ color: "var(--color-text-primary)" }}
        >
          {t("legal.cancelContracts")}
        </Link>
      </nav>
    </footer>
  );
}
