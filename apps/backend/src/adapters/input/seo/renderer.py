"""Server-seitiges SEO/GEO-Rendering für die öffentliche Website.

Die App ist eine Client-SPA — Crawler ohne JavaScript (GPTBot, ClaudeBot,
PerplexityBot, viele Social-Previews) sähen sonst nur ein leeres <div>.
nginx bindet pro Request per SSI den Head (Titel, Beschreibung, Canonical,
Open Graph, JSON-LD) und lesbaren Inhalt in index.html ein; die SPA
übernimmt danach wie gewohnt.

Alle dynamischen Texte (KI-generierte Buchtitel!) werden maskiert.
"""

from __future__ import annotations

import html
import json
from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Any
from xml.sax.saxutils import escape as xml_escape

from ....core.domain.entities.book import Book
from ....core.domain.value_objects.language import Language
from .landing_copy import COPY, NATIVE_NAMES, OG_LOCALES, money, trial_period

SITE_NAME = "Kibuka"
DEFAULT_IMAGE = "/og-image.png"
LOGO = "/logo.png"

LANGUAGE_NAMES: dict[Language, str] = {
    Language.DE: "Deutsch",
    Language.AR: "Arabisch",
    Language.FR: "Französisch",
    Language.EN: "Englisch",
}
LANGUAGE_ORDER = [Language.DE, Language.AR, Language.FR, Language.EN]

# Startseite pro Sprache — Deutsch bleibt "/" und ist auch x-default
LANGUAGE_HOME_PATHS: dict[Language, str] = {
    Language.DE: "/",
    Language.AR: "/ar",
    Language.FR: "/fr",
    Language.EN: "/en",
}

THEME_NAMES: dict[str, str] = {
    "animals": "Tiere",
    "adventure": "Abenteuer",
    "friendship": "Freundschaft",
    "nature": "Natur",
    "culture": "Kultur",
    "values": "Werte",
}

HOME_TITLE = "Kibuka – Jeden Tag ein neues Kinderbuch in 4 Sprachen"
HOME_DESCRIPTION = (
    "Kibuka schenkt mehrsprachigen Familien jeden Tag ein neues illustriertes "
    "Kinderbuch zum Vorlesen und Mitlesen – auf Deutsch, Arabisch, Französisch "
    "und Englisch."
)

FAQ: list[tuple[str, str]] = [
    (
        "Was ist Kibuka?",
        "Kibuka ist eine Lese-App für Kinder von 3 bis 10 Jahren: Jeden Tag erscheint "
        "ein neues, KI-illustriertes Kinderbuch, das in vier Sprachen vorgelesen wird "
        "und Wort für Wort mitläuft.",
    ),
    (
        "In welchen Sprachen gibt es die Bücher?",
        "Jedes Buch gibt es auf Deutsch, Arabisch, Französisch und Englisch – mit "
        "Vorlese-Audio und Wort-Hervorhebung. Ideal für mehrsprachige Familien.",
    ),
    (
        "Was kostet Kibuka?",
        "Das Buch des Tages ist gratis. Einzelne Bücher kosten {single} €, das Abo mit "
        "allen Büchern {monthly} € im Monat oder {yearly} € im Jahr – jeweils inkl. MwSt.",
    ),
    (
        "Kann ich das Abo kündigen?",
        "Ja, jederzeit ohne Mindestlaufzeit über „Abo verwalten“ im Profil. Das erste "
        "Abo startet mit {trial} Tagen kostenloser Testphase.",
    ),
    (
        "Ist Kibuka werbefrei?",
        "Im Lese-Modus gibt es nie Werbung. Mit einem Abo ist Kibuka komplett werbefrei.",
    ),
]


@dataclass(frozen=True)
class Prices:
    single: float
    monthly: float
    yearly: float
    trial_days: int


@dataclass
class SeoPage:
    title: str
    description: str
    canonical: str | None
    robots: str = "index, follow, max-image-preview:large"
    og_type: str = "website"
    image: str | None = None
    json_ld: list[dict[str, Any]] = field(default_factory=list)
    body_html: str = ""
    locale: str = "de_DE"
    # (hreflang, absolute URL) — nur für Seiten mit echten Sprachvarianten
    alternates: list[tuple[str, str]] = field(default_factory=list)

    def head_html(self) -> str:
        e = html.escape
        parts = [
            f"<title>{e(self.title)}</title>",
            f'<meta name="description" content="{e(self.description)}">',
            f'<meta name="robots" content="{e(self.robots)}">',
        ]
        if self.canonical:
            parts.append(f'<link rel="canonical" href="{e(self.canonical)}">')
        parts += [
            f'<link rel="alternate" hreflang="{e(code)}" href="{e(href)}">'
            for code, href in self.alternates
        ]
        image = self.image
        parts += [
            f'<meta property="og:site_name" content="{SITE_NAME}">',
            f'<meta property="og:locale" content="{e(self.locale)}">',
        ]
        if self.alternates:
            parts += [
                f'<meta property="og:locale:alternate" content="{locale}">'
                for locale in OG_LOCALES.values()
                if locale != self.locale
            ]
        parts += [
            f'<meta property="og:type" content="{e(self.og_type)}">',
            f'<meta property="og:title" content="{e(self.title)}">',
            f'<meta property="og:description" content="{e(self.description)}">',
            '<meta name="twitter:card" content="summary_large_image">',
            f'<meta name="twitter:title" content="{e(self.title)}">',
            f'<meta name="twitter:description" content="{e(self.description)}">',
        ]
        if self.canonical:
            parts.append(f'<meta property="og:url" content="{e(self.canonical)}">')
        if image:
            parts += [
                f'<meta property="og:image" content="{e(image)}">',
                f'<meta name="twitter:image" content="{e(image)}">',
            ]
        if self.json_ld:
            parts.append(_json_ld_script(self.json_ld))
        return "\n".join(parts)


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------


def _json_ld_script(nodes: list[dict[str, Any]]) -> str:
    payload = json.dumps({"@context": "https://schema.org", "@graph": nodes}, ensure_ascii=False)
    # "<" maskieren: ein Titel wie "</script>" darf den Block nie beenden
    payload = payload.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return f'<script type="application/ld+json">{payload}</script>'


def _price(value: float) -> str:
    return f"{value:.2f}"


def _price_de(value: float) -> str:
    return _price(value).replace(".", ",")


def _titles(book: Book) -> dict[Language, str]:
    return {t.language: t.title for t in book.translations if t.title}


def _main_title(book: Book) -> str:
    titles = _titles(book)
    return titles.get(Language.DE) or next(iter(titles.values()), "Kinderbuch")


def _ages(book: Book) -> tuple[int, int]:
    low, _, high = str(book.age_range.value).partition("-")
    return int(low), int(high or low)


def _excerpt(book: Book, limit: int = 600) -> str:
    texts: list[str] = []
    for page in sorted(book.pages, key=lambda p: p.page_number)[:2]:
        content = page.get_content(Language.DE)
        if content and content.text:
            texts.append(content.text.strip())
    joined = " ".join(texts)
    return joined if len(joined) <= limit else joined[: limit - 1].rsplit(" ", 1)[0] + "…"


def _clip(text: str, limit: int = 160) -> str:
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


def _organization(base: str) -> dict[str, Any]:
    return {
        "@type": "Organization",
        "@id": f"{base}/#organization",
        "name": SITE_NAME,
        "url": f"{base}/",
        "logo": f"{base}{LOGO}",
        "description": "Täglich neue KI-illustrierte Kinderbücher für mehrsprachige Familien.",
    }


def _website(base: str) -> dict[str, Any]:
    return {
        "@type": "WebSite",
        "@id": f"{base}/#website",
        "name": SITE_NAME,
        "url": f"{base}/",
        "inLanguage": "de",
        "publisher": {"@id": f"{base}/#organization"},
    }


def _breadcrumbs(base: str, trail: Sequence[tuple[str, str]]) -> dict[str, Any]:
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i, "name": name, "item": f"{base}{path}"}
            for i, (name, path) in enumerate(trail, start=1)
        ],
    }


def _book_card(book: Book) -> str:
    e = html.escape
    low, high = _ages(book)
    price = "Gratis" if book.price_single == 0 else f"{_price_de(book.price_single)} €"
    return (
        f'<li><a href="/books/{e(book.id)}">{e(_main_title(book))}</a> '
        f"– {low}–{high} Jahre, {e(THEME_NAMES.get(str(book.theme.value), ''))}, {price}</li>"
    )


def _book_list(books: Sequence[Book]) -> str:
    return "<ul>" + "".join(_book_card(b) for b in books) + "</ul>" if books else ""


def _nav(labels: tuple[str, str, str] = ("Start", "Bibliothek", "Preise"), home: str = "/") -> str:
    start, library, pricing = (html.escape(label) for label in labels)
    return (
        f'<nav><a href="{home}">{start}</a> · <a href="/library">{library}</a> · '
        f'<a href="/pricing">{pricing}</a></nav>'
    )


def _wrap(inner: str, nav: str | None = None, lang: Language | None = None) -> str:
    # Wird von der SPA beim Start ersetzt (createRoot leert #root)
    attrs = f' lang="{lang.value}" dir="{_dir(lang)}"' if lang else ""
    return f'<main class="kibuka-seo"{attrs}>{nav or _nav()}{inner}</main>'


def _dir(lang: Language) -> str:
    return "rtl" if lang == Language.AR else "ltr"


def _language_alternates(base: str) -> list[tuple[str, str]]:
    return [(lang.value, f"{base}{LANGUAGE_HOME_PATHS[lang]}") for lang in LANGUAGE_ORDER] + [
        ("x-default", f"{base}/")
    ]


def _language_switcher(label: str) -> str:
    links = " · ".join(
        f'<a href="{LANGUAGE_HOME_PATHS[lang]}" hreflang="{lang.value}" lang="{lang.value}">'
        f"{html.escape(NATIVE_NAMES[lang])}</a>"
        for lang in LANGUAGE_ORDER
    )
    return f"<p>{html.escape(label)} {links}</p>"


# ---------------------------------------------------------------------------
# Seiten
# ---------------------------------------------------------------------------


def home_page(base: str, daily: Book | None, books: Sequence[Book], prices: Prices) -> SeoPage:
    e = html.escape
    daily_html = ""
    if daily:
        daily_html = (
            f'<section><h2>Buch des Tages: <a href="/books/{e(daily.id)}">'
            f"{e(_main_title(daily))}</a></h2><p>Heute gratis lesen und anhören.</p></section>"
        )
    body = _wrap(
        "<h1>Kibuka – jeden Tag ein neues Kinderbuch in 4 Sprachen</h1>"
        f"<p>{e(HOME_DESCRIPTION)} Für Kinder von 3 bis 10 Jahren, mit Vorlese-Audio "
        "und Wort-für-Wort-Hervorhebung.</p>"
        f"{daily_html}"
        f"<section><h2>Neue Bücher</h2>{_book_list(books)}</section>"
        f'<p><a href="/pricing">Abo ab {_price_de(prices.monthly)} € im Monat – '
        f"{prices.trial_days} Tage gratis testen</a></p>"
        f"{_language_switcher('Auch auf:')}"
    )
    image = daily.cover_image_url if daily and daily.cover_image_url else f"{base}{DEFAULT_IMAGE}"
    return SeoPage(
        title=HOME_TITLE,
        description=_clip(HOME_DESCRIPTION),
        canonical=f"{base}/",
        image=image,
        json_ld=[_website(base), _organization(base)],
        body_html=body,
        alternates=_language_alternates(base),
    )


def _localized_link(book: Book, lang: Language) -> str:
    """Buchlink mit Titel in der Seitensprache, sonst dem deutschen (als lang markiert)."""
    titles = _titles(book)
    title, lang_attr = titles.get(lang), ""
    if not title:
        title, lang_attr = _main_title(book), ' lang="de"'
    return f'<a href="/books/{html.escape(book.id)}"{lang_attr}>{html.escape(title)}</a>'


def language_home_page(
    base: str, lang: Language, daily: Book | None, books: Sequence[Book], prices: Prices
) -> SeoPage:
    """Startseite in einer Familiensprache (/ar, /fr, /en); Deutsch bleibt "/"."""
    if lang == Language.DE:
        return home_page(base, daily, books, prices)
    e = html.escape
    copy = COPY[lang]
    values = {
        "single": money(lang, prices.single),
        "monthly": money(lang, prices.monthly),
        "yearly": money(lang, prices.yearly),
        "trial": trial_period(lang, prices.trial_days),
    }
    faq = [(q, a.format(**values)) for q, a in copy.faq]
    url = f"{base}{LANGUAGE_HOME_PATHS[lang]}"

    daily_html = ""
    if daily:
        daily_html = (
            f"<section><h2>{e(copy.daily_heading)} {_localized_link(daily, lang)}</h2>"
            f"<p>{e(copy.daily_note)}</p></section>"
        )
    books_html = ""
    if books:
        items = "".join(
            f"<li>{_localized_link(b, lang)} – "
            f"{e(copy.ages.format(low=_ages(b)[0], high=_ages(b)[1]))}</li>"
            for b in books
        )
        books_html = f"<section><h2>{e(copy.books_heading)}</h2><ul>{items}</ul></section>"
    benefits = "".join(f"<li>{e(b)}</li>" for b in copy.benefits)
    faq_html = "".join(f"<h3>{e(q)}</h3><p>{e(a)}</p>" for q, a in faq)

    body = _wrap(
        f"<h1>{e(copy.h1)}</h1><p>{e(copy.intro)}</p><ul>{benefits}</ul>"
        f"{daily_html}{books_html}"
        f'<p><a href="/pricing">{e(copy.cta.format(**values))}</a> · '
        f'<a href="/library">{e(copy.library_link)}</a></p>'
        f"<section><h2>{e(copy.faq_heading)}</h2>{faq_html}</section>"
        f"{_language_switcher(copy.languages_label)}",
        nav=_nav(copy.nav, home=LANGUAGE_HOME_PATHS[lang]),
        lang=lang,
    )
    image = daily.cover_image_url if daily and daily.cover_image_url else f"{base}{DEFAULT_IMAGE}"
    return SeoPage(
        title=copy.title,
        description=_clip(copy.description),
        canonical=url,
        image=image,
        locale=OG_LOCALES[lang],
        alternates=_language_alternates(base),
        json_ld=[
            {
                "@type": "WebPage",
                "@id": f"{url}#webpage",
                "url": url,
                "name": copy.title,
                "description": copy.description,
                "inLanguage": lang.value,
                "isPartOf": {"@id": f"{base}/#website"},
            },
            {
                "@type": "FAQPage",
                "inLanguage": lang.value,
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": q,
                        "acceptedAnswer": {"@type": "Answer", "text": a},
                    }
                    for q, a in faq
                ],
            },
            _website(base),
            _organization(base),
        ],
        body_html=body,
    )


def library_page(base: str, books: Sequence[Book], prices: Prices) -> SeoPage:
    body = _wrap(
        "<h1>Bibliothek: mehrsprachige Kinderbücher</h1>"
        "<p>Alle Kibuka-Bücher auf Deutsch, Arabisch, Französisch und Englisch – "
        "sortiert nach Neuerscheinung.</p>"
        f"{_book_list(books)}"
    )
    item_list = {
        "@type": "ItemList",
        "name": "Kibuka Bibliothek",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i,
                "url": f"{base}/books/{b.id}",
                "name": _main_title(b),
            }
            for i, b in enumerate(books, start=1)
        ],
    }
    return SeoPage(
        title="Bibliothek – mehrsprachige Kinderbücher | Kibuka",
        description=_clip(
            "Alle Kibuka-Kinderbücher auf einen Blick: illustrierte Geschichten für 3- bis "
            "10-Jährige auf Deutsch, Arabisch, Französisch und Englisch, mit Vorlese-Audio."
        ),
        canonical=f"{base}/library",
        image=f"{base}{DEFAULT_IMAGE}",
        json_ld=[
            item_list,
            _breadcrumbs(base, [("Kibuka", "/"), ("Bibliothek", "/library")]),
            _organization(base),
        ],
        body_html=body,
    )


def book_page(base: str, book: Book, prices: Prices) -> SeoPage:
    e = html.escape
    title = _main_title(book)
    titles = _titles(book)
    low, high = _ages(book)
    theme = THEME_NAMES.get(str(book.theme.value), "")
    url = f"{base}/books/{book.id}"
    free = book.price_single == 0

    other_titles = "".join(
        f'<li>{LANGUAGE_NAMES[lang]}: <span lang="{lang.value}" '
        f'dir="{"rtl" if lang == Language.AR else "ltr"}">{e(titles[lang])}</span></li>'
        for lang in LANGUAGE_ORDER
        if lang != Language.DE and lang in titles
    )
    excerpt = _excerpt(book)
    price_text = (
        "Heute gratis lesen" if free else f"Einzelkauf {_price_de(book.price_single)} € inkl. MwSt."
    )
    cover = (
        f'<img src="{e(book.cover_image_url)}" alt="Cover: {e(title)}" width="512" height="512">'
        if book.cover_image_url
        else ""
    )
    body = _wrap(
        f"<h1>{e(title)}</h1>{cover}"
        f"<p>Ein illustriertes Kinderbuch für {low} bis {high} Jahre"
        f"{' zum Thema ' + e(theme) if theme else ''}, {book.page_count} Seiten, "
        "vorgelesen in vier Sprachen.</p>"
        f"<h2>Titel in anderen Sprachen</h2><ul>{other_titles}</ul>"
        + (f"<h2>Leseprobe</h2><p>{e(excerpt)}</p>" if excerpt else "")
        + f'<p>{price_text} · <a href="/library">Zur Bibliothek</a> · '
        f'<a href="/pricing">Alle Bücher im Abo</a></p>'
    )

    description = _clip(
        f"„{title}“: ein mehrsprachiges Kinderbuch für {low}–{high} Jahre zum Vorlesen "
        "und Mitlesen – auf Deutsch, Arabisch, Französisch und Englisch."
    )
    offer: dict[str, Any] = {
        "@type": "Offer",
        "price": _price(book.price_single),
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock",
        "url": url,
    }
    book_node: dict[str, Any] = {
        "@type": "Book",
        "@id": f"{url}#book",
        "name": title,
        "alternateName": [
            titles[lang] for lang in LANGUAGE_ORDER if lang in titles and titles[lang] != title
        ],
        "url": url,
        "inLanguage": [lang.value for lang in LANGUAGE_ORDER if lang in titles] or ["de"],
        "bookFormat": "https://schema.org/EBook",
        "numberOfPages": book.page_count,
        "datePublished": book.published_at.date().isoformat(),
        "genre": theme or None,
        "audience": {
            "@type": "PeopleAudience",
            "suggestedMinAge": low,
            "suggestedMaxAge": high,
        },
        "publisher": {"@id": f"{base}/#organization"},
        "isAccessibleForFree": free,
        "offers": offer,
    }
    if book.cover_image_url:
        book_node["image"] = book.cover_image_url
    if excerpt:
        book_node["abstract"] = excerpt
    book_node = {k: v for k, v in book_node.items() if v is not None}

    return SeoPage(
        title=f"{title} – Kinderbuch in 4 Sprachen | {SITE_NAME}",
        description=description,
        canonical=url,
        og_type="book",
        image=book.cover_image_url or f"{base}{DEFAULT_IMAGE}",
        json_ld=[
            book_node,
            _breadcrumbs(
                base,
                [("Kibuka", "/"), ("Bibliothek", "/library"), (title, f"/books/{book.id}")],
            ),
            _organization(base),
        ],
        body_html=body,
    )


def _faq(prices: Prices) -> list[tuple[str, str]]:
    return [
        (
            q,
            a.format(
                single=_price_de(prices.single),
                monthly=_price_de(prices.monthly),
                yearly=_price_de(prices.yearly),
                trial=prices.trial_days,
            ),
        )
        for q, a in FAQ
    ]


def pricing_page(base: str, prices: Prices) -> SeoPage:
    e = html.escape
    faq = _faq(prices)
    body = _wrap(
        "<h1>Preise: Kinderbücher in 4 Sprachen</h1>"
        "<ul>"
        f"<li>Jahresabo: {_price_de(prices.yearly)} € pro Jahr – alle Bücher, 2 Monate gespart</li>"
        f"<li>Monatsabo: {_price_de(prices.monthly)} € pro Monat – alle Bücher</li>"
        f"<li>Einzelbuch: {_price_de(prices.single)} € pro Buch</li>"
        "</ul>"
        f"<p>Alle Preise inkl. MwSt. Das erste Abo startet mit {prices.trial_days} Tagen "
        "kostenloser Testphase und ist jederzeit kündbar.</p>"
        "<h2>Häufige Fragen</h2>" + "".join(f"<h3>{e(q)}</h3><p>{e(a)}</p>" for q, a in faq)
    )
    offers = [
        {
            "@type": "Offer",
            "name": "Monatsabo",
            "price": _price(prices.monthly),
            "priceCurrency": "EUR",
            "priceSpecification": {
                "@type": "UnitPriceSpecification",
                "price": _price(prices.monthly),
                "priceCurrency": "EUR",
                "billingDuration": "P1M",
            },
            "url": f"{base}/pricing",
        },
        {
            "@type": "Offer",
            "name": "Jahresabo",
            "price": _price(prices.yearly),
            "priceCurrency": "EUR",
            "priceSpecification": {
                "@type": "UnitPriceSpecification",
                "price": _price(prices.yearly),
                "priceCurrency": "EUR",
                "billingDuration": "P1Y",
            },
            "url": f"{base}/pricing",
        },
        {
            "@type": "Offer",
            "name": "Einzelbuch",
            "price": _price(prices.single),
            "priceCurrency": "EUR",
            "url": f"{base}/library",
        },
    ]
    return SeoPage(
        title=f"Preise – Kinderbuch-Abo ab {_price_de(prices.monthly)} € | {SITE_NAME}",
        description=_clip(
            f"Kibuka im Abo: alle mehrsprachigen Kinderbücher für {_price_de(prices.monthly)} € "
            f"im Monat oder {_price_de(prices.yearly)} € im Jahr, {prices.trial_days} Tage gratis "
            "testen, jederzeit kündbar."
        ),
        canonical=f"{base}/pricing",
        image=f"{base}{DEFAULT_IMAGE}",
        json_ld=[
            {
                "@type": "Product",
                "name": "Kibuka – mehrsprachige Kinderbücher",
                "description": HOME_DESCRIPTION,
                "brand": {"@id": f"{base}/#organization"},
                "image": f"{base}{DEFAULT_IMAGE}",
                "offers": offers,
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": q,
                        "acceptedAnswer": {"@type": "Answer", "text": a},
                    }
                    for q, a in faq
                ],
            },
            _breadcrumbs(base, [("Kibuka", "/"), ("Preise", "/pricing")]),
            _organization(base),
        ],
        body_html=body,
    )


def noindex_page(base: str, path: str) -> SeoPage:
    """Private oder unbekannte Seiten: nicht indexieren, keine Canonical."""
    return SeoPage(
        title=SITE_NAME,
        description=_clip(HOME_DESCRIPTION),
        canonical=None,
        robots="noindex, follow",
        image=f"{base}{DEFAULT_IMAGE}",
    )


# ---------------------------------------------------------------------------
# Sitemap + llms.txt
# ---------------------------------------------------------------------------

_QUOT = {'"': "&quot;"}


def sitemap_xml(base: str, books: Sequence[Book]) -> str:
    # Jede Sprachvariante der Startseite nennt alle Varianten inkl. sich selbst
    alternates = "".join(
        f'<xhtml:link rel="alternate" hreflang="{code}" href="{xml_escape(href, _QUOT)}"/>'
        for code, href in _language_alternates(base)
    )

    def url(loc: str, lastmod: str | None = None, image: str | None = None, links: str = "") -> str:
        parts = [f"<loc>{xml_escape(loc)}</loc>"]
        if lastmod:
            parts.append(f"<lastmod>{lastmod}</lastmod>")
        if image:
            parts.append(f"<image:image><image:loc>{xml_escape(image)}</image:loc></image:image>")
        return "<url>" + "".join(parts) + links + "</url>"

    latest = max((b.published_at for b in books), default=None)
    latest_day = latest.date().isoformat() if latest else None
    entries = (
        [
            url(f"{base}{path}", latest_day, links=alternates)
            for path in LANGUAGE_HOME_PATHS.values()
        ]
        + [
            url(f"{base}/library", latest_day),
            url(f"{base}/pricing"),
        ]
        + [
            url(f"{base}/books/{b.id}", b.published_at.date().isoformat(), b.cover_image_url)
            for b in books
        ]
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "\n".join(entries) + "\n</urlset>\n"
    )


def llms_txt(base: str, books: Sequence[Book], prices: Prices) -> str:
    lines = [
        "# Kibuka",
        "",
        "> Kibuka ist eine Lese-App für Kinder von 3 bis 10 Jahren: Jeden Tag erscheint ein "
        "neues, KI-illustriertes Kinderbuch, vorgelesen auf Deutsch, Arabisch, Französisch "
        "und Englisch – mit Wort-für-Wort-Hervorhebung zum Mitlesen.",
        "",
        "## Fakten",
        "",
        "- Zielgruppe: mehrsprachige Familien, Kinder von 3 bis 10 Jahren",
        "- Sprachen: Deutsch, Arabisch (mit Rechts-nach-links-Darstellung), Französisch, Englisch",
        "- Jeden Tag ein neues Buch; das Buch des Tages ist gratis",
        f"- Preise (inkl. MwSt.): Einzelbuch {_price_de(prices.single)} €, Monatsabo "
        f"{_price_de(prices.monthly)} €, Jahresabo {_price_de(prices.yearly)} €",
        f"- Erstes Abo mit {prices.trial_days} Tagen kostenloser Testphase, jederzeit kündbar",
        "- Lese-Modus immer werbefrei; mit Abo komplett werbefrei",
        "- Plattformen: Web (installierbar als App), Android, iOS",
        "",
        "## Wichtige Seiten",
        "",
        f"- [Startseite]({base}/): Buch des Tages und neue Bücher",
        f"- [Bibliothek]({base}/library): alle Bücher",
        f"- [Preise]({base}/pricing): Abo, Einzelkauf und häufige Fragen",
        "",
        "## Sprachversionen der Startseite",
        "",
        f"- [{NATIVE_NAMES[Language.DE]}]({base}/): Startseite auf Deutsch",
        f"- [{NATIVE_NAMES[Language.AR]}]({base}/ar): الصفحة الرئيسية بالعربية",
        f"- [{NATIVE_NAMES[Language.FR]}]({base}/fr): page d’accueil en français",
        f"- [{NATIVE_NAMES[Language.EN]}]({base}/en): home page in English",
        "",
        "## Bücher",
        "",
    ]
    for b in books:
        low, high = _ages(b)
        lines.append(f"- [{_main_title(b)}]({base}/books/{b.id}): {low}–{high} Jahre")
    return "\n".join(lines) + "\n"
