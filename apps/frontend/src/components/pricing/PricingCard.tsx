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
        "relative flex flex-col rounded-[24px] p-7 lg:p-8",
        isHighlighted ? "highlighted border-2" : "border-[1.5px]",
      )}
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: isHighlighted
          ? "var(--color-primary)"
          : "var(--color-border)",
        boxShadow: isHighlighted
          ? "0 22px 40px -28px rgba(51, 67, 168, 0.6)"
          : undefined,
      }}
    >
      {badge && (
        <div className="absolute -top-3.5 inset-x-0 flex justify-center">
          <span
            className="inline-flex items-center rounded-full px-3.5 py-1.5 text-[13px] font-bold whitespace-nowrap"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "var(--color-on-accent)",
            }}
          >
            {badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <p
          className="text-base font-bold mb-1.5"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {title}
        </p>

        <div className="flex items-baseline gap-2 mb-2 flex-wrap">
          <span
            className="text-[44px] font-extrabold leading-none"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
            }}
          >
            {price}
          </span>
          {priceNote && (
            <span
              className="text-[15px]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {priceNote}
            </span>
          )}
        </div>

        {savings && (
          <span
            className="inline-flex items-center rounded-full text-[13px] font-bold px-3 py-1"
            style={{
              backgroundColor: "var(--color-surface-raised)",
              color: "var(--color-success-text)",
            }}
          >
            {savings}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-3 mb-8 flex-1 p-0 m-0 list-none">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-[15px]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-success-text)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            >
              <path d="M4.5 12.5l5 5 10-11" />
            </svg>
            <span style={{ color: "var(--color-text-primary)" }}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onCta}
        className={cn(
          "w-full h-14 rounded-2xl px-6 font-bold text-[17px] transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-text)]",
          isHighlighted
            ? "hover:bg-[var(--color-primary-dark)]"
            : "border-2 hover:bg-[var(--color-primary-soft)]",
        )}
        style={
          isHighlighted
            ? {
                backgroundColor: "var(--color-primary)",
                color: "var(--color-on-primary)",
              }
            : {
                borderColor: "var(--color-primary)",
                color: "var(--color-primary-text)",
              }
        }
      >
        {ctaLabel}
      </button>
    </div>
  );
}
