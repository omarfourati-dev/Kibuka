import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Zap } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { cn } from "../../utils/cn";

interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
  ctaLink: string;
}

const tiers: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfect for side projects and prototyping.",
    features: [
      "3 spaces",
      "1,000 AI requests / month",
      "Community support",
      "Basic auth (email + Google)",
      "1 GB storage",
    ],
    highlighted: false,
    cta: "Get Started",
    ctaLink: "/login",
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 29,
    annualPrice: 24,
    description: "For growing products that need full AI capabilities.",
    features: [
      "Unlimited spaces",
      "50,000 AI requests / month",
      "RAG (document Q&A)",
      "ReAct Agents",
      "Priority email support",
      "50 GB storage",
      "Custom domains",
      "Webhook integrations",
    ],
    highlighted: true,
    cta: "Start Pro Trial",
    ctaLink: "/login",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 99,
    annualPrice: 83,
    description: "Dedicated infrastructure, SLA, and white-glove onboarding.",
    features: [
      "Everything in Pro",
      "Unlimited AI requests",
      "99.9% uptime SLA",
      "SSO (SAML / OIDC)",
      "Custom AI model fine-tuning",
      "Dedicated success manager",
      "Unlimited storage",
      "Audit logs & compliance exports",
    ],
    highlighted: false,
    cta: "Contact Sales",
    ctaLink: "mailto:sales@omarsapp.com",
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    document.title = "Pricing — OmarsApp";
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Nav */}
      <header className="border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="font-bold text-xl text-slate-900 dark:text-white"
          >
            OmarsApp
          </Link>
          <Link to="/login">
            <Button size="sm">Sign In</Button>
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20">
        {/* Heading */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-8">
            Start free. Upgrade when you need more AI power or advanced
            features.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                !annual
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                annual
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400",
              )}
            >
              Annual
              <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-medium px-1.5 py-0.5 rounded-full">
                <Zap className="w-2.5 h-2.5" />2 months free
              </span>
            </button>
          </div>
        </div>

        {/* Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {tiers.map((tier) => {
            const price = annual ? tier.annualPrice : tier.monthlyPrice;
            return (
              <div
                key={tier.id}
                className={cn(
                  "rounded-2xl border p-8 flex flex-col",
                  tier.highlighted
                    ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200 dark:shadow-blue-900"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700",
                )}
              >
                <div className="mb-6">
                  <p
                    className={cn(
                      "text-sm font-semibold uppercase tracking-wide mb-1",
                      tier.highlighted
                        ? "text-blue-100"
                        : "text-blue-600 dark:text-blue-400",
                    )}
                  >
                    {tier.name}
                  </p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-4xl font-bold">€{price}</span>
                    {price > 0 && (
                      <span
                        className={cn(
                          "text-sm mb-1",
                          tier.highlighted
                            ? "text-blue-100"
                            : "text-slate-500 dark:text-slate-400",
                        )}
                      >
                        /mo{annual && " billed annually"}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-sm",
                      tier.highlighted
                        ? "text-blue-100"
                        : "text-slate-600 dark:text-slate-400",
                    )}
                  >
                    {tier.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <Check
                        className={cn(
                          "w-4 h-4 flex-shrink-0 mt-0.5",
                          tier.highlighted ? "text-blue-200" : "text-green-500",
                        )}
                      />
                      <span
                        className={cn(
                          tier.highlighted
                            ? "text-blue-50"
                            : "text-slate-700 dark:text-slate-300",
                        )}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {tier.ctaLink.startsWith("mailto:") ? (
                  <a href={tier.ctaLink}>
                    <Button
                      className="w-full"
                      variant={tier.highlighted ? "secondary" : "primary"}
                    >
                      {tier.cta}
                    </Button>
                  </a>
                ) : (
                  <Link to={tier.ctaLink}>
                    <Button
                      className="w-full"
                      variant={tier.highlighted ? "secondary" : "primary"}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} OmarsApp &mdash; All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
