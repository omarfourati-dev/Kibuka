# Rechtliche Pflichtfunktionen (Verkauf an Verbraucher)

Technische Umsetzung der Pflichten, die Kibuka als Online-Shop für digitale
Inhalte und Abos in Deutschland erfüllen muss. Die **Rechtstexte selbst**
(Impressum, Datenschutzerklärung, AGB, Widerrufsbelehrung) liegen nicht hier,
sondern auf `omarfourati.de` und müssen fachlich geprüft werden.

## 1. Pflichtlinks auf jeder Seite

- `LegalFooter` (`apps/frontend/src/components/legal/`) am Ende jeder Seite:
  Impressum, Datenschutz, **„Verträge hier kündigen"**.
- Dieselben Links rendert das Backend in die Crawler-Fassung
  (`renderer.py`, `_legal_footer`). Ziele: `src/lib/legal.ts` (Frontend) und
  die Konstanten in `renderer.py` (Backend) — bei Änderung beide anpassen.
- `<footer role="contentinfo">` explizit: IonContent hängt den Inhalt in ein
  `<main>` im Shadow DOM, ohne die Rolle wäre die Fußzeile keine Landmark.

## 2. Widerrufsverzicht vor dem Kauf (§ 356 Abs. 5 BGB)

- Häkchen `WithdrawalWaiver` (nie vorausgewählt) auf Buchdetail- und Preisseite.
- Das Backend lehnt `POST /billing/checkout/book` und
  `/billing/checkout/subscription` ohne `withdrawal_waiver: true` mit **422** ab.
- Der Zeitpunkt der Zustimmung landet als `metadata.withdrawal_waiver_at` an der
  Stripe-Checkout-Session (Nachweis direkt am Kauf).

## 3. Kündigungsbutton (§ 312k BGB)

- Seite `/kuendigen` (ohne Login): Name, E-Mail, optionale Vertragsangabe,
  ordentlich/außerordentlich (+ Pflicht-Grund), Button **„Jetzt kündigen"**,
  danach Bestätigung mit Vorgangsnummer, Datum und Uhrzeit zum Drucken/Speichern.
- `POST /api/v1/contracts/cancellation` → Use Case `SubmitCancellation`:
  - jede Erklärung wird in `contract_cancellations` gespeichert (Migration 0005)
  - **ordentlich** + aktives Abo → Stripe `cancel_at_period_end` (Zugang bis Laufzeitende)
  - **außerordentlich** → `manual_review` (Grund von Hand prüfen)
  - Stripe-Fehler → `failed`, die Kündigung bleibt gespeichert
  - Bestätigungs-E-Mail (Vorlage `templates/email/contract_cancellation.html`)
- Die Antwort ist für bekannte und unbekannte Adressen identisch (keine
  Konto-Enumeration). Drosselung: 10 Anfragen pro IP und Stunde (Redis,
  `X-Real-IP` von nginx); fällt Redis aus, wird nicht gedrosselt.

### Betrieb

- **E-Mail-Versand braucht SMTP** — GitHub-Secrets `SMTP_HOST`, `SMTP_USER`,
  `SMTP_PASSWORD` (optional `SMTP_PORT`, `EMAIL_FROM`). Ohne `SMTP_USER` wird nur
  gewarnt (`SMTP not configured`) und **keine Bestätigung in Textform** versendet.
- Offene Fälle finden:

  ```sql
  SELECT id, received_at, email, kind, reason, outcome
  FROM contract_cancellations
  WHERE outcome IN ('manual_review', 'failed')
  ORDER BY received_at;
  ```
