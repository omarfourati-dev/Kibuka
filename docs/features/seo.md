# SEO & GEO (Search + AI-Engine Optimization)

Technische SEO für klassische Suchmaschinen und GEO (Generative Engine Optimization) für AI-Suche (ChatGPT, Perplexity, Google AI Overviews).

---

## Klassische SEO

### Meta-Tags (per Page)

```tsx
// Jede Page setzt document.title + meta description
useEffect(() => {
  document.title = `Feature Name — MyApp`;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", "Kurze Beschreibung (150-160 Zeichen)");
}, []);
```

Landing Page: Open Graph (`og:title`, `og:description`, `og:image`, `og:type`).

### Schema.org JSON-LD

`index.html` enthält:

- `WebSite` mit `SearchAction` (Sitelinks Searchbox)
- `Organization` mit `logo`, `contactPoint`
- `Product` auf der Pricing-Page

Feature-Pages ergänzen je nach Kontext: `HowTo`, `FAQPage`, `BreadcrumbList`.

### Technische Checkliste

- [ ] `robots.txt` — korrekte Crawl-Direktiven
- [ ] `sitemap.xml` — alle öffentlichen URLs, `<lastmod>` aktuell
- [ ] Canonical URLs auf jeder Page
- [ ] Keine duplizierten `<title>` Tags
- [ ] Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1
- [ ] Mobile-First (320px Viewport getestet)
- [ ] HTTPS everywhere (HSTS Header)
- [ ] Interne Verlinkungsstruktur sinnvoll (Hub & Spoke)

---

## GEO — Generative Engine Optimization

AI-Suchmaschinen zitieren Quellen wenn: der Text klar strukturiert ist, E-E-A-T-Signale stark sind, und Inhalte passage-level zitierbar sind.

### `public/llms.txt`

Standardisierte Datei für AI-Crawler (ähnlich robots.txt für LLMs):

```
# MyApp
> AI-first SaaS-Starter für schnelles Produktentwicklung

## Wichtigste Seiten
- [Pricing](/pricing): Pläne und Preise
- [Docs](/docs): Technische Dokumentation
- [Blog](/blog): Artikel zu SaaS, AI, Produktentwicklung
```

### Passage-Level Citability

- Kurze, eigenständige Absätze (≤120 Wörter pro Absatz)
- Jeder Absatz beantwortet genau eine Frage
- Überschriften als Fragen formulieren (H2/H3)
- Beispiel: "Wie funktioniert das Billing?" statt "Billing"

### E-E-A-T Signale

- **Experience**: Konkrete Zahlen (z.B. "50ms Response Time")
- **Expertise**: Technische Tiefe in Docs
- **Authoritativeness**: Externe Links zu Standards (RFC, MDN, OpenAPI)
- **Trustworthiness**: Datenschutz-Link im Footer, Impressum

### AI-Platform-Spezifisch

| Platform            | Optimierung                                              |
| ------------------- | -------------------------------------------------------- |
| Google AI Overviews | Featured-Snippet-Format (direkte Antwort in erstem Satz) |
| Perplexity          | Faktendichte, Quellen-Links                              |
| ChatGPT             | `llms.txt`, klare Produktbeschreibung                    |
| Bing Copilot        | Schema.org, strukturierte Daten                          |
