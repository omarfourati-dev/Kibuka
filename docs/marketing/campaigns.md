# Kampagnen-Playbook

Templates und Frameworks für Wachstums-Kampagnen.

---

## Cold Outreach (AIDA-Framework)

```
Betreff: [Pain-Point direkt ansprechen]

Attention: Eine Statistik oder Frage die schmerzt.
Interest: Was andere in dieser Situation tun.
Desire: Was möglich wäre (konkretes Ergebnis).
Action: Ein klarer, kleiner nächster Schritt.

PS: Persönlicher Bezug (immer)
```

**Beispiel — AI-SaaS für Entwickler:**

> Betreff: 3 Stunden weniger Code-Review-Zeit pro Woche?
>
> Die meisten Teams verlieren 40% ihrer Sprint-Zeit in Reviews. Nicht an der Qualität — an der Koordination.
>
> Teams die AI-gestützte Reviews einsetzen berichten von 60% kürzeren Review-Zeiten bei gleicher Qualität.
>
> Mit MyApp läuft das aus der Box — kein Setup, keine Prompts schreiben.
>
> 15-Minuten-Demo diese Woche?
>
> PS: Habt ihr ein K8s-Setup? Ich hab einen spezifischen Tipp dafür.

---

## Pricing-Kampagne (Anchor + Decoy)

Landing-Page-Preisstruktur:

1. **Free** (€0) — Decoy nach unten, zeigt was entgeht
2. **Pro** (€29/Monat) — **Featured**, "Beliebteste Wahl"
3. **Business** (€99/Monat) — Anchor nach oben, lässt Pro günstig wirken

Jährlicher Toggle: "-20%" (Loss Aversion: "Spare €70 im Jahr")

---

## Content-Kampagne (SEO + GEO)

**Hub & Spoke Modell:**

Hub-Artikel (pillar content):

- "Der komplette Guide zu AI-first SaaS 2025"

Spoke-Artikel (topic cluster):

- "RAG vs. Fine-Tuning: Wann was?"
- "pgvector vs. Pinecone: Kostenvergleich"
- "FastAPI vs. Django für AI-Apps"

Jeder Spoke-Artikel verlinkt zum Hub. Hub verlinkt zu allen Spokes.

**GEO-Format**: Jeder Artikel beginnt mit einer direkten Antwort auf die Keyword-Frage (für AI-Overviews zitierbar).

---

## Launch-Kampagne (Product Hunt)

Vorbereitung (4 Wochen vor Launch):

- [ ] Teaser-Landing mit E-Mail-Waitlist aufbauen
- [ ] Hunter mit >500 Followern ansprechen
- [ ] 50 Beta-User gewinnen (persönliche Einladungen)
- [ ] Launch-Assets: Screenshots, Demo-GIF, Tagline

Launch-Tag:

- 12:01 AM PST posten (maximale Upvote-Zeit)
- Alle persönlichen Netzwerke aktivieren
- In relevanten Slack-Gruppen teilen (keine Spam)

---

## Referral-Programm

"Bring einen Freund, beide bekommen 1 Monat gratis"

Mechanik:

1. User generiert persönlichen Referral-Link
2. Neuer User registriert sich via Link
3. Neuer User konvertiert zu Paid
4. Beide erhalten Gutschrift automatisch (Stripe Credits)

Tracking: `ref=<user_id>` Query-Parameter → in User-Record speichern.
