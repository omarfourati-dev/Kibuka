import { useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { IonContent, IonPage } from "@ionic/react";
import { getAuthHeaders, useAuthStore } from "@omarsapp/shared-stores";
import { LegalFooter } from "../components/legal/LegalFooter";
import { TopNav } from "../components/layout/TopNav";
import { WithdrawalWaiver } from "../components/legal/WithdrawalWaiver";
import { PricingCard } from "../components/pricing/PricingCard";
import { useAppLanguage } from "../hooks/useAppLanguage";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatPrice } from "../lib/locale";
import type { Language } from "../lib/rtl";
import { cn } from "../utils/cn";

// ─── FAQ ─────────────────────────────────────────────────────────────────────

interface FaqItem {
  question: string;
  answer: string;
}

// Übersetzungsschlüssel pricing.faq<Key>Q / pricing.faq<Key>A, in dieser Reihenfolge
const FAQ_KEYS = ["Cancel", "Languages", "Age", "Trial", "Devices"] as const;

// ─── Pricing Plans ───────────────────────────────────────────────────────────

type PlanId = "yearly" | "monthly" | "single";

interface PricingPlan {
  id: PlanId;
  title: string;
  price: string;
  priceNote?: string;
  savings?: string;
  features: string[];
  isHighlighted: boolean;
  badge?: string;
}

function buildPlans(t: TFunction, lang: Language): PricingPlan[] {
  const subscriptionFeatures = [
    t("pricing.featureUnlimited"),
    t("pricing.featureLanguages"),
    t("pricing.featureAudio"),
    t("pricing.featureHighlighting"),
    t("pricing.featureDaily"),
  ];
  return [
    // Yearly shown first (anchor price, best value)
    {
      id: "yearly",
      title: t("pricing.planYearly"),
      price: formatPrice(99, lang),
      priceNote: t("pricing.perYear"),
      savings: t("pricing.savings"),
      features: subscriptionFeatures,
      isHighlighted: false,
      badge: t("pricing.badgeBestValue"),
    },
    // Monthly — highlighted / most popular (decoy effect)
    {
      id: "monthly",
      title: t("pricing.planMonthly"),
      price: formatPrice(14.99, lang),
      priceNote: t("pricing.perMonth"),
      features: subscriptionFeatures,
      isHighlighted: true,
      badge: t("pricing.badgePopular"),
    },
    // Einzelbuch — Kauf passiert direkt auf der Buchseite
    {
      id: "single",
      title: t("pricing.planSingle"),
      price: formatPrice(2.99, lang),
      priceNote: t("pricing.perBook"),
      features: [
        t("pricing.featureOneBook"),
        t("pricing.featureLanguages"),
        t("pricing.featureAudio"),
        t("pricing.featureKeep"),
      ],
      isHighlighted: false,
    },
  ];
}

// ─── FaqAccordionItem ─────────────────────────────────────────────────────────

function FaqAccordionItem({ question, answer }: FaqItem) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between py-4 text-start text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary-text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-text)] rounded"
      >
        <span>{question}</span>
        <span
          aria-hidden="true"
          className={cn(
            "flex-shrink-0 ms-4 text-lg transition-transform duration-200",
            open ? "rotate-45" : "rotate-0",
          )}
        >
          +
        </span>
      </button>
      {open && (
        <p className="pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {answer}
        </p>
      )}
    </div>
  );
}

// ─── PricingPage ──────────────────────────────────────────────────────────────

export default function PricingPage() {
  const history = useHistory();
  const location = useLocation();
  const { isAuthenticated, accessToken } = useAuthStore();
  const { t } = useTranslation();
  const lang = useAppLanguage();
  usePageTitle(t("meta.pricing"));
  const plans = buildPlans(t, lang);
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [waiverMissing, setWaiverMissing] = useState(false);
  // Schlüssel statt Text speichern, damit ein Sprachwechsel auch den Hinweis übersetzt
  const [notice, setNotice] = useState<string | null>(() =>
    new URLSearchParams(location.search).get("subscription") === "cancel"
      ? "pricing.noticeCancelled"
      : null,
  );

  const handleCta = async (plan: PlanId) => {
    if (plan === "single") {
      history.push("/library");
      return;
    }
    if (!isAuthenticated || !accessToken) {
      history.push(`/login?redirect=${encodeURIComponent("/pricing")}`);
      return;
    }
    // Widerrufsverzicht (§ 356 Abs. 5 BGB) muss aktiv bestätigt sein
    if (!waiverAccepted) {
      setWaiverMissing(true);
      return;
    }
    setNotice(null);
    setPendingPlan(plan);
    try {
      const res = await fetch("/api/v1/billing/checkout/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ plan, withdrawal_waiver: true }),
      });
      if (res.status === 401) {
        history.push(`/login?redirect=${encodeURIComponent("/pricing")}`);
        return;
      }
      if (res.status === 409) {
        setNotice("pricing.noticeAlreadySubscribed");
        setPendingPlan(null);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (!res.ok || !data.url) {
        setNotice("pricing.noticeUnavailable");
        setPendingPlan(null);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setNotice("pricing.noticeUnavailable");
      setPendingPlan(null);
    }
  };

  return (
    <IonPage>
      <IonContent>
        <TopNav />
        <div
          className="min-h-screen"
          style={{
            backgroundColor: "var(--color-background)",
            color: "var(--color-text-primary)",
          }}
        >
          {/* Hero */}
          <section className="max-w-3xl mx-auto px-6 pt-8 pb-10 lg:pt-14 lg:pb-12 text-center">
            <h1
              className="text-[34px] md:text-5xl font-extrabold mb-4 leading-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t("pricing.headline")}
            </h1>
            <p
              className="text-lg md:text-xl max-w-xl mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t("pricing.subline")}
            </p>
          </section>

          {/* Pricing cards */}
          <section className="max-w-6xl mx-auto px-6 pb-16">
            {notice && (
              <div
                role="status"
                className="mb-8 max-w-2xl mx-auto rounded-2xl px-5 py-4 text-center font-medium"
                style={{
                  backgroundColor: "rgba(255, 217, 61, 0.18)",
                  border: "2px solid #FFD93D",
                  color: "var(--color-text-primary)",
                }}
              >
                {t(notice)}
              </div>
            )}
            <div className="mb-8 max-w-2xl mx-auto">
              <WithdrawalWaiver
                checked={waiverAccepted}
                onChange={setWaiverAccepted}
                showError={waiverMissing}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start max-w-5xl mx-auto">
              {plans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  title={plan.title}
                  price={plan.price}
                  priceNote={plan.priceNote}
                  savings={plan.savings}
                  features={plan.features}
                  isHighlighted={plan.isHighlighted}
                  badge={plan.badge}
                  ctaLabel={
                    pendingPlan === plan.id
                      ? t("pricing.redirecting")
                      : t("pricing.cta")
                  }
                  onCta={() => void handleCta(plan.id)}
                />
              ))}
            </div>

            {/* Loss aversion note */}
            <p
              className="text-center text-sm mt-8"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("pricing.vatNote")}
            </p>
          </section>

          {/* FAQ */}
          <section className="max-w-2xl mx-auto px-6 pb-20">
            <h2
              className="text-2xl font-bold text-center mb-8"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t("pricing.faqHeading")}
            </h2>
            <div
              className="rounded-2xl border p-6"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface)",
              }}
            >
              {FAQ_KEYS.map((key) => (
                <FaqAccordionItem
                  key={key}
                  question={t(`pricing.faq${key}Q`)}
                  answer={t(`pricing.faq${key}A`)}
                />
              ))}
            </div>
          </section>

          <div
            className="border-t"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="max-w-6xl mx-auto px-6 pt-8 text-center">
              <p
                className="text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                &copy; {new Date().getFullYear()} Kibuka &mdash;{" "}
                {t("pricing.rights")}
              </p>
            </div>
            <LegalFooter />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
