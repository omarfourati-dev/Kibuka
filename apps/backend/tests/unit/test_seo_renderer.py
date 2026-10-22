"""TDD RED: Server-seitiges SEO/GEO-Rendering.

Live-Befund 22.10.: Für Crawler ohne JavaScript (GPTBot, ClaudeBot,
PerplexityBot …) war jede Seite leer (0 Zeichen), und ALLE URLs meldeten
denselben Titel und dieselbe Canonical-URL (/) — Google sollte sie damit
als Duplikate der Startseite behandeln. Der Renderer liefert pro Seite
eigenen Head (Titel, Beschreibung, Canonical, OG, JSON-LD) und lesbaren
Inhalt.
"""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime

from src.adapters.input.seo.renderer import (
    Prices,
    book_page,
    home_page,
    library_page,
    llms_txt,
    noindex_page,
    pricing_page,
    sitemap_xml,
)
from src.core.domain.entities.book import Book, BookPage, BookTranslation, PageContent
from src.core.domain.value_objects.language import AgeRange, BookTheme, Language

BASE = "https://kibuka.omarfourati.de"
PRICES = Prices(single=2.99, monthly=14.99, yearly=99.0, trial_days=14)


def _book(
    book_id: str = "b1",
    title_de: str = "Lilly entdeckt die Jahreszeiten",
    price: float = 2.99,
    daily: bool = False,
) -> Book:
    titles = {
        Language.DE: title_de,
        Language.EN: "Lilly Discovers the Seasons",
        Language.FR: "Lilly découvre les saisons",
        Language.AR: "ليلي تكتشف الفصول",
    }
    return Book(
        id=book_id,
        theme=BookTheme.NATURE,
        age_range=AgeRange.MIDDLE,
        page_count=6,
        price_single=price,
        published_at=datetime(2026, 10, 21, 6, 0, tzinfo=UTC),
        is_daily_book=daily,
        cover_image_url=f"{BASE}/kibuka-assets/books/{book_id}/cover.webp",
        translations=[
            BookTranslation(book_id=book_id, language=lang, title=t) for lang, t in titles.items()
        ],
        pages=[
            BookPage(
                id=f"{book_id}-p1",
                book_id=book_id,
                page_number=1,
                contents=[
                    PageContent(
                        page_id=f"{book_id}-p1",
                        language=Language.DE,
                        text="Lilly schaut aus dem Fenster. Die Blätter werden bunt.",
                    )
                ],
            )
        ],
    )


def _json_ld(head: str) -> list[dict]:
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', head, re.S)
    graph: list[dict] = []
    for b in blocks:
        data = json.loads(b)
        graph.extend(data.get("@graph", [data]))
    return graph


def _types(head: str) -> set[str]:
    return {node["@type"] for node in _json_ld(head)}


# ---------------------------------------------------------------------------
# Buchseite
# ---------------------------------------------------------------------------


class TestBookPage:
    def test_has_unique_title_description_and_canonical(self) -> None:
        page = book_page(BASE, _book(), PRICES)
        head = page.head_html()

        assert "<title>Lilly entdeckt die Jahreszeiten" in head
        assert "Kibuka</title>" in head
        assert f'<link rel="canonical" href="{BASE}/books/b1">' in head
        assert 'name="robots" content="index, follow' in head
        description = re.search(r'name="description" content="([^"]+)"', head)
        assert description and 50 <= len(description.group(1)) <= 160

    def test_social_preview_uses_the_cover(self) -> None:
        head = book_page(BASE, _book(), PRICES).head_html()
        assert f'property="og:image" content="{BASE}/kibuka-assets/books/b1/cover.webp"' in head
        assert 'property="og:type" content="book"' in head
        assert 'name="twitter:card" content="summary_large_image"' in head

    def test_book_structured_data(self) -> None:
        nodes = _json_ld(book_page(BASE, _book(), PRICES).head_html())
        book = next(n for n in nodes if n["@type"] == "Book")

        assert book["name"] == "Lilly entdeckt die Jahreszeiten"
        assert set(book["inLanguage"]) == {"de", "ar", "fr", "en"}
        assert "Lilly Discovers the Seasons" in book["alternateName"]
        assert book["numberOfPages"] == 6
        assert book["audience"]["suggestedMinAge"] == 5
        assert book["audience"]["suggestedMaxAge"] == 8
        assert book["offers"]["price"] == "2.99"
        assert book["offers"]["priceCurrency"] == "EUR"
        assert book["bookFormat"] == "https://schema.org/EBook"

    def test_free_daily_book_is_marked_free(self) -> None:
        nodes = _json_ld(book_page(BASE, _book(price=0, daily=True), PRICES).head_html())
        book = next(n for n in nodes if n["@type"] == "Book")
        assert book["isAccessibleForFree"] is True

    def test_breadcrumbs(self) -> None:
        nodes = _json_ld(book_page(BASE, _book(), PRICES).head_html())
        crumbs = next(n for n in nodes if n["@type"] == "BreadcrumbList")
        names = [i["name"] for i in crumbs["itemListElement"]]
        assert names == ["Kibuka", "Bibliothek", "Lilly entdeckt die Jahreszeiten"]

    def test_body_is_readable_without_javascript(self) -> None:
        body = book_page(BASE, _book(), PRICES).body_html
        assert "<h1>Lilly entdeckt die Jahreszeiten</h1>" in body
        # Mehrsprachige Titel mit Sprach- und Schreibrichtungs-Attributen
        assert '<span lang="ar" dir="rtl">ليلي تكتشف الفصول</span>' in body
        assert "Lilly schaut aus dem Fenster." in body
        assert 'href="/library"' in body

    def test_ai_generated_title_cannot_inject_html_or_break_json_ld(self) -> None:
        evil = "</script><script>alert(1)</script><img src=x onerror=alert(2)>"
        page = book_page(BASE, _book(title_de=evil), PRICES)
        head, body = page.head_html(), page.body_html

        assert "<script>alert(1)" not in head
        assert "<script>alert(1)" not in body
        assert "<img src=x" not in body
        # JSON-LD bleibt gültig und enthält kein schließendes Script-Tag
        assert "</script><script>" not in head
        assert any(n["@type"] == "Book" for n in _json_ld(head))


# ---------------------------------------------------------------------------
# Startseite, Bibliothek, Preise
# ---------------------------------------------------------------------------


class TestHomePage:
    def test_head_and_organization_data(self) -> None:
        head = home_page(BASE, _book(daily=True), [_book()], PRICES).head_html()
        assert f'<link rel="canonical" href="{BASE}/">' in head
        assert {"WebSite", "Organization"} <= _types(head)
        # Keine SearchAction — eine Suche gibt es (noch) nicht
        assert "SearchAction" not in head

    def test_body_names_the_value_and_links_books(self) -> None:
        body = home_page(BASE, _book("d1", daily=True), [_book("b2")], PRICES).body_html
        assert "<h1>" in body and "Kinderbuch" in body
        assert 'href="/books/d1"' in body
        assert 'href="/books/b2"' in body
        assert 'href="/pricing"' in body


class TestLibraryPage:
    def test_lists_every_book_with_item_list(self) -> None:
        page = library_page(BASE, [_book("b1"), _book("b2")], PRICES)
        assert f'<link rel="canonical" href="{BASE}/library">' in page.head_html()
        assert "ItemList" in _types(page.head_html())
        assert 'href="/books/b1"' in page.body_html
        assert 'href="/books/b2"' in page.body_html


class TestPricingPage:
    def test_offers_and_faq_come_from_real_prices(self) -> None:
        page = pricing_page(BASE, PRICES)
        head, body = page.head_html(), page.body_html
        nodes = _json_ld(head)

        product = next(n for n in nodes if n["@type"] == "Product")
        prices = sorted(o["price"] for o in product["offers"])
        assert prices == ["14.99", "2.99", "99.00"]
        assert "FAQPage" in _types(head)
        # FAQ-Antworten müssen auch sichtbar im Inhalt stehen (Google-Richtlinie)
        faq = next(n for n in nodes if n["@type"] == "FAQPage")
        for q in faq["mainEntity"]:
            assert q["name"] in body
        assert "14,99" in body and "inkl. MwSt" in body


class TestNoindex:
    def test_private_and_unknown_pages_are_noindex(self) -> None:
        for path in ("/profile", "/login", "/app/settings", "/gibt-es-nicht"):
            head = noindex_page(BASE, path).head_html()
            assert 'name="robots" content="noindex' in head
            assert 'rel="canonical"' not in head


# ---------------------------------------------------------------------------
# Sitemap + llms.txt
# ---------------------------------------------------------------------------


class TestSitemap:
    def test_contains_static_pages_and_every_book_with_cover(self) -> None:
        xml = sitemap_xml(BASE, [_book("b1"), _book("b2")])
        for loc in ("/", "/library", "/pricing", "/books/b1", "/books/b2"):
            assert f"<loc>{BASE}{loc}</loc>" in xml
        assert "<lastmod>2026-10-21</lastmod>" in xml
        assert f"<image:loc>{BASE}/kibuka-assets/books/b1/cover.webp</image:loc>" in xml
        assert 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' in xml

    def test_escapes_xml(self) -> None:
        xml = sitemap_xml(BASE, [_book("b&1")])
        assert "b&amp;1" in xml


class TestLlmsTxt:
    def test_describes_product_with_facts_and_book_links(self) -> None:
        txt = llms_txt(BASE, [_book("b1")], PRICES)
        assert txt.startswith("# Kibuka")
        for fact in ("Deutsch", "Arabisch", "Französisch", "Englisch", "14,99", "99", "2,99"):
            assert fact in txt
        assert f"({BASE}/books/b1)" in txt
        assert f"({BASE}/pricing)" in txt
