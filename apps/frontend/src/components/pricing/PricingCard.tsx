import { cn } from "../../utils/cn";

export interface PricingCardProps {
  title: string;
  price: string;
  priceNote?: string;
  savings?: string;
  features: string[];
  isHighlighted?: boolean;
  badge?: string;
  ctaLabel: string;
  onCta: () => void;
}

export function PricingCard({
  title,
  price,
  priceNote,
  savings,
  features,
  isHighlighted = false,
  badge,
  ctaLabel,
  onCta,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-8 transition-all duration-200",
        isHighlighted
          ? "highlighted border-orange-400 bg-orange-50 ring-2 ring-orange-400 shadow-lg shadow-orange-100 dark:bg-orange-950/20 dark:border-orange-500 dark:ring-orange-500 dark:shadow-orange-900/30"
          : "border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm",
      )}
    >
      {/* Badge */}
      {badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white shadow-md whitespace-nowrap">
            {badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <p
          className={cn(
            "text-sm font-semibold uppercase tracking-wide mb-2",
            isHighlighted
              ? "text-orange-600 dark:text-orange-400"
              : "text-slate-500 dark:text-slate-400",
          )}
        >
          {title}
        </p>

        <div className="flex items-end gap-1.5 mb-1">
          <span
            className={cn(
              "text-4xl font-extrabold",
              isHighlighted
                ? "text-orange-600 dark:text-orange-400"
                : "text-slate-900 dark:text-white",
            )}
          >
            {price}
          </span>
          {priceNote && (
            <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">
              {priceNote}
            </span>
          )}
        </div>

        {savings && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-semibold px-2.5 py-0.5">
            {savings}
          </span>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex-shrink-0 text-base leading-none",
                isHighlighted
                  ? "text-orange-500 dark:text-orange-400"
                  : "text-green-500 dark:text-green-400",
              )}
            >
              ✓
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        type="button"
        onClick={onCta}
        className={cn(
          "w-full rounded-xl py-3 px-6 font-semibold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isHighlighted
            ? "bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500 shadow-md hover:shadow-lg"
            : "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
        )}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
