# Funnel-Analyse

Der Conversion-Funnel von Erstkontakt bis zum zahlenden Kunden.

---

## Funnel-Stufen

```
Besucher → Trial-Signup → Onboarding → Aha-Moment → Paid → Retention → Referral
```

### Stufe 1: Besucher → Trial-Signup

**Ziel**: >3% Conversion Rate

Drop-off-Gründe:

- Unklares Value Proposition (→ Hero-Text schärfen)
- Kein sozialer Beweis (→ Testimonials, Logos)
- Kein Risiko-Abbau (→ "Kreditkarte nicht nötig")

Optimierungen:

- A/B-Test: Hero-Headline (Pain-First vs. Benefit-First)
- CTA-Button-Text: "Kostenlos starten" vs. "14 Tage testen"
- Exit-Intent Popup mit Rabatt

### Stufe 2: Signup → Onboarding-Completion

**Ziel**: >70% komplettieren alle 5 Schritte

Schritte:

1. E-Mail verifizieren (Schritt 1)
2. Space erstellen (Schritt 2)
3. Profil ausfüllen (Schritt 3)
4. Ersten AI-Chat absenden (Schritt 4 = Aha-Moment)
5. Dokument hochladen oder Webhook konfigurieren (Schritt 5)

Drop-off-Tracking: Pro Schritt in PostHog als Funnel-Event tracken.

### Stufe 3: Aha-Moment

**Definition**: User sendet erste AI-Anfrage innerhalb von 5 Minuten nach Signup.

Users die den Aha-Moment erreichen konvertieren 3x häufiger zu Paid.

Wenn User nach 24h noch in Schritt 3 oder früher: E-Mail mit "Fertig machen"-CTA senden.

### Stufe 4: Trial → Paid

**Ziel**: >15% Trial-to-Paid

Trigger-E-Mails:

- Tag 1: Onboarding-Abschluss-Bestätigung
- Tag 3: Feature-Tipp (RAG, Agents)
- Tag 7: "Dein Trial endet in 7 Tagen" + Preis
- Tag 12: "Letzte Chance" + Testimonial
- Tag 14: Trial-Ende + Downgrade-Warnung

### Stufe 5: Retention

**Ziel**: Month-1 Retention >40%

Churn-Risiko erkennen:

- Kein Login >7 Tage → "Wir vermissen dich" E-Mail
- Keine AI-Anfragen >14 Tage → Feature-Reminder

---

## Metriken in PostHog

```javascript
posthog.capture("funnel_step_completed", {
  step: 4,
  step_name: "first_ai_request",
  time_since_signup_seconds: 240,
});
```
