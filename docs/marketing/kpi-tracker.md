# KPI Tracker

Kernmetriken für Wachstum und Produkt-Health. Täglich/wöchentlich prüfen.

---

## Akquisition

| KPI                               | Ziel     | Quelle                     |
| --------------------------------- | -------- | -------------------------- |
| Organischer Traffic               | +10% MoM | Google Analytics / PostHog |
| AI-Search-Impressions             | Tracking | Google Search Console      |
| Trial-Signups                     | —        | Datenbank                  |
| CAC (Customer Acquisition Cost)   | <€50     | Ad-Spend / Neukunden       |
| Conversion Rate (Visitor → Trial) | >3%      | PostHog Funnel             |

## Aktivierung

| KPI                    | Ziel       | Messung                   |
| ---------------------- | ---------- | ------------------------- |
| Time-to-Aha-Moment     | <5 Minuten | Zeit bis erste AI-Anfrage |
| Onboarding-Completion  | >70%       | Schritt 1-5 abgeschlossen |
| DAU/MAU Ratio          | >40%       | PostHog                   |
| Feature Adoption (RAG) | >30%       | Events pro User           |

## Umsatz

| KPI                             | Ziel         | Quelle               |
| ------------------------------- | ------------ | -------------------- |
| MRR (Monthly Recurring Revenue) | Wachstum     | Stripe               |
| Trial → Paid Conversion         | >15%         | Stripe Events        |
| Churn Rate                      | <3% / Monat  | Stripe Cancellations |
| ARPU (Average Revenue per User) | —            | MRR / Paid Users     |
| LTV (Lifetime Value)            | ARPU / Churn | Berechnet            |

## Retention

| KPI                      | Ziel | Messung         |
| ------------------------ | ---- | --------------- |
| Week-1 Retention         | >60% | PostHog Cohorts |
| Month-1 Retention        | >40% | PostHog Cohorts |
| NPS (Net Promoter Score) | >40  | In-App Survey   |

## Produkt-Health

| KPI              | Ziel       | Quelle              |
| ---------------- | ---------- | ------------------- |
| API P99 Latenz   | <1 Sekunde | Grafana             |
| Error Rate (5xx) | <0.1%      | Prometheus / Sentry |
| Uptime           | >99.9%     | Uptime-Monitor      |

---

## Reporting-Rhythmus

- **Täglich**: Error Rate, P99, Uptime (automatisch via Alerts)
- **Wöchentlich**: Traffic, Signups, Trial-Conversions
- **Monatlich**: MRR, Churn, LTV, NPS
