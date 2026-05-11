import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
      "Ja, jederzeit ohne Mindestlaufzeit. Du kannst dein Abo in den Einstellungen mit einem Klick beenden. Es entstehen keine weiteren Kosten.",
  },
  {
    question: "Welche Sprachen sind enthalten?",
    answer:
      "Alle Bücher sind in vier Sprachen verfügbar: Deutsch, Arabisch, Französisch und Englisch. Du kannst jederzeit zwischen den Sprachen wechseln.",
  },
  {
    question: "Für welches Alter sind die Bücher geeignet?",
    answer:
      "Kibuka ist für Kinder von 3 bis 8 Jahren konzipiert. Unsere KI erstellt altersgerechte Geschichten mit einfacher Sprache und bunten Illustrationen.",
  },
  {
    question: "Gibt es eine Probezeit?",
    answer:
      "Ja! Du kannst Kibuka 14 Tage kostenlos testen. Keine Kreditkarte erforderlich für die Testphase.",
  },
  {
    question: "Auf welchen Geräten kann ich Kibuka nutzen?",
    answer:
      "Kibuka ist auf allen modernen Geräten verfügbar: Web (Browser), iOS (iPhone/iPad) und Android. Deine Bücher sind überall dabei.",
  },
];

// ─── Pricing Plans ───────────────────────────────────────────────────────────

interface PricingPlan {
  id: string;
  title: string;
  price: string;
  priceNote?: string;
  savings?: string;
  features: string[];
  isHighlighted: boolean;
  badge?: string;
  ctaLabel: string;
}

const PLANS: PricingPlan[] = [
  // Yearly shown first (anchor price, best value)
  {
    id: "yearly",
    title: "Jährlich",
    price: "€99",
    priceNote: "pro Jahr",
    savings: "Spare 2 Monate",
    features: [
      "Alle Bücher unbegrenzt",
      "4 Sprachen: DE, AR, FR, EN",
      "Audio-Vorlese-Funktion",
      "Wort-Highlighting (Karaoke)",
      "Offline verfügbar",
      "Neue Bücher täglich",
    ],
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
    features: [
      "Alle Bücher unbegrenzt",
      "4 Sprachen: DE, AR, FR, EN",
      "Audio-Vorlese-Funktion",
      "Wort-Highlighting (Karaoke)",
      "Offline verfügbar",
      "Neue Bücher täglich",
    ],
    isHighlighted: true,
    badge: "Beliebteste Wahl",
    ctaLabel: "Jetzt starten",
  },
  // Wochenpaket
  {
    id: "weekly",
    title: "Wochenpaket",
    price: "€7,99",
    priceNote: "7 Bücher",
    savings: "Spare €6 vs. Einzelkauf",
    features: [
      "7 Bücher zur freien Auswahl",
      "4 Sprachen: DE, AR, FR, EN",
      "Audio-Vorlese-Funktion",
      "Gültig 7 Tage",
    ],
    isHighlighted: false,
    ctaLabel: "Jetzt starten",
  },
  // Einzelbuch
  {
    id: "single",
    title: "Einzelbuch",
    price: "€1,99",
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
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Preise — Kibuka";
  }, []);

  return (
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
            to="/"
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
          mehrsprachige Familien, die ihren Kindern die Welt eröffnen möchten.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
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
              ctaLabel={plan.ctaLabel}
              onCta={() => navigate("/library")}
            />
          ))}
        </div>

        {/* Loss aversion note */}
        <p
          className="text-center text-sm mt-8"
          style={{ color: "var(--color-text-muted)" }}
        >
          14 Tage kostenlos testen &mdash; keine Kreditkarte erforderlich.
          Jederzeit kündbar.
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
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            &copy; {new Date().getFullYear()} Kibuka &mdash; Alle Rechte
            vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  );
}
