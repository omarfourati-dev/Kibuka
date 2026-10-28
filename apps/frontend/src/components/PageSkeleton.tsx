import { useTranslation } from "react-i18next";

/**
 * Platzhalter, solange eine Seite nachlädt — statt eines weißen Bildschirms
 * (Live 28.10.: Bibliothek ~1,5 s leer). Quadratische Flächen wie die Cover.
 */
export function PageSkeleton() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-label={t("app.loading")}
      className="flex flex-col gap-8 px-5 py-8 max-w-6xl mx-auto"
      style={{ backgroundColor: "var(--color-background)", minHeight: "100%" }}
    >
      <div
        className="h-8 w-40 rounded-full animate-pulse"
        style={{ backgroundColor: "var(--color-surface-raised)" }}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div
              className="aspect-square rounded-xl animate-pulse"
              style={{ backgroundColor: "var(--color-surface-raised)" }}
            />
            <div
              className="h-4 w-3/4 rounded-full animate-pulse"
              style={{ backgroundColor: "var(--color-surface-raised)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
