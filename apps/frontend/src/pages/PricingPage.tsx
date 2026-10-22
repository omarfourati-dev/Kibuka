import { useEffect, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { IonContent, IonPage } from "@ionic/react";
import { getAuthHeaders, useAuthStore } from "@omarsapp/shared-stores";
import { PricingCard } from "../components/pricing/PricingCard";
import { cn } from "../utils/cn";

// ─── FAQ ─────────────────────────────────────────────────────────────────────

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Kann ich kündigen?",
    answer:
      "Ja, jederzeit ohne Mindestlaufzeit. Im Profil unter „Abo verwalten“ kündigst du mit wenigen Klicks — das Abo läuft dann bis zum Ende der bezahlten Periode.",
  },
  {
    question: "Welche Sprachen sind enthalten?",
    answer:
      "Alle Bücher sind in vier Sprachen verfügbar: Deutsch, Arabisch, Französisch und Englisch. Du kannst jederzeit zwischen den Sprachen wechseln.",
  },
  {
    question: "Für welches Alter sind die Bücher geeignet?",
    answer:
      "Kibuka ist für Kinder von 3 bis 10 Jahren konzipiert. Unsere KI erstellt altersgerechte Geschichten mit einfacher Sprache und bunten Illustrationen.",
  },
  {
    question: "Gibt es eine Probezeit?",
    answer:
      "Ja! Dein erstes Abo startet mit 14 Tagen kostenloser Testphase. Du hinterlegst beim Abschluss eine Zahlungsmethode, abgebucht wird aber erst nach Ablauf der Testphase — kündigst du vorher, zahlst du nichts.",
  },
  {
    question: "Auf welchen Geräten kann ich Kibuka nutzen?",
    answer:
      "Kibuka ist auf allen modernen Geräten verfügbar: Web (Browser), iOS (iPhone/iPad) und Android. Deine Bücher sind überall dabei.",
  },
];

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
  ctaLabel: string;
}

const SUBSCRIPTION_FEATURES = [
  "Alle Bücher unbegrenzt lesen",
  "4 Sprachen: DE, AR, FR, EN",
  "Audio-Vorlese-Funktion",
  "Wort-Highlighting (Karaoke)",
  "Jeden Tag ein neues Buch",
];

const PLANS: PricingPlan[] = [
  // Yearly shown first (anchor price, best value)
  {
    id: "yearly",
    title: "Jährlich",
    price: "€99",
    priceNote: "pro Jahr",
    savings: "Spare 2 Monate",
    features: SUBSCRIPTION_FEATURES,
    isHighlighted: false,
    badge: "Bestes Preis-Leistungs-Verhältnis",
    ctaLabel: "Jetzt starten",
  },
  // Monthly — highlighted / most popular (decoy effect)
  {
    id: "monthly",
    title: "Monatlich",
    price: "€14,99",
    priceNote: "pro Monat",
    features: SUBSCRIPTION_FEATURES,
    isHighlighted: true,
    badge: "Beliebteste Wahl",
    ctaLabel: "Jetzt starten",
  },
  // Einzelbuch — Kauf passiert direkt auf der Buchseite
  {
    id: "single",
    title: "Einzelbuch",
    price: "€2,99",
    priceNote: "pro Buch",
    features: [
      "1 Buch deiner Wahl",
      "4 Sprachen: DE, AR, FR, EN",
      "Audio-Vorlese-Funktion",
      "Dauerhaft in deiner Bibliothek",
    ],
    isHighlighted: false,
    ctaLabel: "Jetzt starten",
  },
];

// ─── FaqAccordionItem ─────────────────────────────────────────────────────────

function FaqAccordionItem({ question, answer }: FaqItem) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-slate-900 dark:text-white hover:text-orange-500 dark:hover:text-orange-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded"
      >
        <span>{question}</span>
        <span
          aria-hidden="true"
          className={cn(
            "flex-shrink-0 ml-4 text-lg transition-transform duration-200",
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
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [notice, setNotice] = useState<string | null>(() =>
    new URLSearchParams(location.search).get("subscription") === "cancel"
      ? "Abo-Abschluss abgebrochen — es wurde nichts berechnet."
      : null,
  );

  useEffect(() => {
    document.title = "Preise — Kibuka";
  }, []);

  const handleCta = async (plan: PlanId) => {
    if (plan === "single") {
      history.push("/library");
      return;
    }
    if (!isAuthenticated || !accessToken) {
      history.push(`/login?redirect=${encodeURIComponent("/pricing")}`);
      return;
    }
    setNotice(null);
    setPendingPlan(plan);
    try {
      const res = await fetch("/api/v1/billing/checkout/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ plan }),
      });
      if (res.status === 401) {
        history.push(`/login?redirect=${encodeURIComponent("/pricing")}`);
        return;
      }
      if (res.status === 409) {
        setNotice(
          "Du hast bereits ein aktives Abo — verwalte es in deinem Profil.",
        );
        setPendingPlan(null);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (!res.ok || !data.url) {
        setNotice(
          "Abo-Abschluss ist gerade nicht möglich. Bitte versuche es später erneut.",
        );
        setPendingPlan(null);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setNotice(
        "Abo-Abschluss ist gerade nicht möglich. Bitte versuche es später erneut.",
      );
      setPendingPlan(null);
    }
  };

  return (
    <IonPage>
      <IonContent>
        <div
          className="min-h-screen"
          style={{
            backgroundColor: "var(--color-background)",
            color: "var(--color-text-primary)",
          }}
        >
          {/* Nav */}
          <header
            className="sticky top-0 z-10 border-b backdrop-blur-sm"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-background)",
            }}
          >
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              <Link
                to="/"
                className="font-extrabold text-xl"
                style={{ color: "var(--color-primary)" }}
              >
                📚 Kibuka
              </Link>
              <Link
                to="/library"
                className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Zur Bibliothek
              </Link>
            </div>
          </header>

          {/* Hero */}
          <section className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h1
              className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              Verpasse keine neuen Bücher mehr
            </h1>
            <p
              className="text-lg md:text-xl max-w-xl mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Täglich ein neues KI-generiertes Kinderbuch in 4 Sprachen — für
              mehrsprachige Familien, die ihren Kindern die Welt eröffnen
              möchten.
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
                {notice}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start max-w-5xl mx-auto">
              {PLANS.map((plan) => (
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
                      ? "Weiterleitung zu Stripe …"
                      : plan.ctaLabel
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
              Alle Preise inkl. MwSt. &mdash; 14 Tage kostenlos testen beim
              ersten Abo. Jederzeit kündbar.
            </p>
          </section>

          {/* FAQ */}
          <section className="max-w-2xl mx-auto px-6 pb-20">
            <h2
              className="text-2xl font-bold text-center mb-8"
              style={{ color: "var(--color-text-primary)" }}
            >
              Häufig gestellte Fragen
            </h2>
            <div
              className="rounded-2xl border p-6"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface)",
              }}
            >
              {FAQ_ITEMS.map((item) => (
                <FaqAccordionItem
                  key={item.question}
                  question={item.question}
                  answer={item.answer}
                />
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer
            className="border-t"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="max-w-6xl mx-auto px-6 py-8 text-center">
              <p
                className="text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                &copy; {new Date().getFullYear()} Kibuka &mdash; Alle Rechte
                vorbehalten.
              </p>
            </div>
          </footer>
        </div>
      </IonContent>
    </IonPage>
  );
}
