import { getDir } from "../../lib/rtl";

interface PreviewPage {
  pageNumber: number;
  text: string;
  illustrationUrl?: string;
}

interface BookPreviewProps {
  pages: PreviewPage[];
  language: string;
}

type SupportedLanguage = "de" | "ar" | "fr" | "en";

function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return ["de", "ar", "fr", "en"].includes(lang);
}

export function BookPreview({ pages, language }: BookPreviewProps) {
  const dir = isSupportedLanguage(language) ? getDir(language) : "ltr";

  return (
    <div data-testid="book-preview" dir={dir} className="flex flex-col gap-8">
      {pages.map((page) => (
        <div
          key={page.pageNumber}
          className="flex flex-col gap-4 rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          {/* Illustration */}
          {page.illustrationUrl && (
            <div className="w-full aspect-video overflow-hidden rounded-xl">
              <img
                src={page.illustrationUrl}
                alt={`Seite ${page.pageNumber}`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Page content */}
          <div className="p-4 flex flex-col gap-2">
            {/* Page number */}
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              {page.pageNumber}
            </span>

            {/* Page text */}
            <p
              className="text-lg leading-relaxed"
              style={{ color: "var(--color-text-primary)" }}
            >
              {page.text}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
