"""TDD RED: Sprachspezifische Landingpages /ar, /fr, /en.

Zielgruppe sind mehrsprachige Familien, die oft in ihrer Herkunftssprache
suchen („قصص أطفال بالعربية“, „livres enfants bilingues“). Bisher gab es nur
eine deutsche Startseite — für Suchen auf Arabisch, Französisch oder
Englisch hatte Kibuka keine passende Seite. Jede Sprachvariante bekommt
eigenen Titel, eigene Canonical, ein vollständiges hreflang-Set und
lesbaren Inhalt in ihrer Sprache.
"""

from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from datetime import UTC, datetime

import pytest

from src.adapters.input.seo.renderer import (
    Prices,
    SeoPage,
    home_page,
    language_home_page,
    llms_txt,
    sitemap_xml,
)
from src.core.domain.entities.book import Book, BookTranslation
from src.core.domain.value_objects.language import AgeRange, BookTheme, Language

BASE = "https://kibuka.omarfourati.de"
PRICES = Prices(single=2.99, monthly=14.99, yearly=99.0, trial_days=14)

LOCALIZED = [Language.AR, Language.FR, Language.EN]
PATHS = {Language.DE: "/", Language.AR: "/ar", Language.FR: "/fr", Language.EN: "/en"}
EXPECTED_HREFLANG = {
    "de": f"{BASE}/",
    "ar": f"{BASE}/ar",
    "fr": f"{BASE}/fr",
    "en": f"{BASE}/en",
    "x-default": f"{BASE}/",
}
ARABIC = re.compile(r"[؀-ۿ]")

TITLES = {
    Language.DE: "Lilly entdeckt die Jahreszeiten",
    Language.EN: "Lilly Discovers the Seasons",
    Language.FR: "Lilly découvre les saisons",
    Language.AR: "ليلي تكتشف الفصول",
}


def _book(
    book_id: str = "b1",
    titles: dict[Language, str] | None = None,
    daily: bool = False,
) -> Book:
    return Book(
        id=book_id,
        theme=BookTheme.NATURE,
        age_range=AgeRange.MIDDLE,
        page_count=6,
        price_single=0 if daily else 2.99,
        published_at=datetime(2026, 10, 21, 6, 0, tzinfo=UTC),
        is_daily_book=daily,
        cover_image_url=f"{BASE}/kibuka-assets/books/{book_id}/cover.webp",
        translations=[
            BookTranslation(book_id=book_id, language=lang, title=t)
            for lang, t in (titles or TITLES).items()
        ],
    )


def _page(lang: Language, books: list[Book] | None = None) -> SeoPage:
    return language_home_page(BASE, lang, _book("d1", daily=True), books or [_book()], PRICES)


def _json_ld(head: str) -> list[dict]:
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', head, re.S)
    graph: list[dict] = []
    for b in blocks:
        graph.extend(json.loads(b).get("@graph", []))
    return graph


def _hreflang(head: str) -> dict[str, str]:
    return dict(re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">', head))


def _meta(head: str, attr: str, name: str) -> str:
    match = re.search(rf'{attr}="{re.escape(name)}" content="([^"]*)"', head)
    assert match, f"{name} fehlt"
    return match.group(1)


# ---------------------------------------------------------------------------
# Head: Titel, Canonical, hreflang, og:locale
# ---------------------------------------------------------------------------


class TestHead:
    @pytest.mark.parametrize("lang", LOCALIZED)
    def test_own_canonical_per_language(self, lang: Language) -> None:
        head = _page(lang).head_html()
        assert f'<link rel="canonical" href="{BASE}{PATHS[lang]}">' in head
        assert 'name="robots" content="index, follow' in head

    def test_titles_and_descriptions_are_unique_per_language(self) -> None:
        heads = [home_page(BASE, None, [], PRICES).head_html()] + [
            _page(lang).head_html() for lang in LOCALIZED
        ]
        titles = [re.search(r"<title>(.*?)</title>", h).group(1) for h in heads]  # type: ignore[union-attr]
        descriptions = [_meta(h, "name", "description") for h in heads]
        assert len(set(titles)) == 4
        assert len(set(descriptions)) == 4
        for title in titles:
            assert "Kibuka" in title and len(title) <= 70
        for description in descriptions:
            assert 50 <= len(description) <= 160

    def test_arabic_title_and_description_are_arabic(self) -> None:
        head = _page(Language.AR).head_html()
        title = re.search(r"<title>(.*?)</title>", head).group(1)  # type: ignore[union-attr]
        assert ARABIC.search(title)
        assert ARABIC.search(_meta(head, "name", "description"))

    @pytest.mark.parametrize(
        ("lang", "locale"),
        [(Language.AR, "ar_AR"), (Language.FR, "fr_FR"), (Language.EN, "en_US")],
    )
    def test_og_locale_matches_language(self, lang: Language, locale: str) -> None:
        head = _page(lang).head_html()
        assert _meta(head, "property", "og:locale") == locale
        alternates = re.findall(r'property="og:locale:alternate" content="([^"]+)"', head)
        assert locale not in alternates and len(alternates) == 3

    def test_german_home_keeps_german_locale(self) -> None:
        head = home_page(BASE, None, [], PRICES).head_html()
        assert _meta(head, "property", "og:locale") == "de_DE"

    @pytest.mark.parametrize("lang", [Language.DE, *LOCALIZED])
    def test_full_reciprocal_hreflang_set_on_every_variant(self, lang: Language) -> None:
        page = (
            home_page(BASE, None, [], PRICES)
            if lang == Language.DE
            else language_home_page(BASE, lang, None, [], PRICES)
        )
        assert _hreflang(page.head_html()) == EXPECTED_HREFLANG

    def test_other_pages_have_no_hreflang(self) -> None:
        # Bibliothek/Bücher gibt es nur einmal — falsche Alternates wären schädlich
        from src.adapters.input.seo.renderer import library_page

        assert _hreflang(library_page(BASE, [], PRICES).head_html()) == {}


# ---------------------------------------------------------------------------
# Strukturierte Daten
# ---------------------------------------------------------------------------


class TestStructuredData:
    @pytest.mark.parametrize("lang", LOCALIZED)
    def test_webpage_declares_its_language(self, lang: Language) -> None:
        nodes = _json_ld(_page(lang).head_html())
        webpage = next(n for n in nodes if n["@type"] == "WebPage")
        assert webpage["inLanguage"] == lang.value
        assert webpage["url"] == f"{BASE}{PATHS[lang]}"
        assert {"WebSite", "Organization", "FAQPage"} <= {n["@type"] for n in nodes}

    @pytest.mark.parametrize("lang", LOCALIZED)
    def test_faq_is_visible_and_in_page_language(self, lang: Language) -> None:
        page = _page(lang)
        faq = next(n for n in _json_ld(page.head_html()) if n["@type"] == "FAQPage")
        assert len(faq["mainEntity"]) >= 4
        for question in faq["mainEntity"]:
            # Google-Richtlinie: FAQ-Inhalt muss sichtbar auf der Seite stehen
            assert question["name"] in page.body_html
            assert question["acceptedAnswer"]["text"] in page.body_html
        if lang == Language.AR:
            assert all(ARABIC.search(q["name"]) for q in faq["mainEntity"])

    @pytest.mark.parametrize(
        ("lang", "monthly"),
        [(Language.AR, "14.99"), (Language.FR, "14,99"), (Language.EN, "14.99")],
    )
    def test_faq_uses_real_prices_in_local_format(self, lang: Language, monthly: str) -> None:
        assert monthly in _page(lang).body_html


# ---------------------------------------------------------------------------
# Lesbarer Inhalt
# ---------------------------------------------------------------------------


class TestBody:
    @pytest.mark.parametrize(
        ("lang", "attrs"),
        [
            (Language.AR, 'lang="ar" dir="rtl"'),
            (Language.FR, 'lang="fr" dir="ltr"'),
            (Language.EN, 'lang="en" dir="ltr"'),
        ],
    )
    def test_content_carries_language_and_direction(self, lang: Language, attrs: str) -> None:
        assert f'<main class="kibuka-seo" {attrs}>' in _page(lang).body_html

    def test_headlines_are_in_the_page_language(self) -> None:
        ar = re.search(r"<h1>(.*?)</h1>", _page(Language.AR).body_html).group(1)  # type: ignore[union-attr]
        fr = re.search(r"<h1>(.*?)</h1>", _page(Language.FR).body_html).group(1)  # type: ignore[union-attr]
        en = re.search(r"<h1>(.*?)</h1>", _page(Language.EN).body_html).group(1)  # type: ignore[union-attr]
        assert ARABIC.search(ar)
        assert "enfant" in fr.lower() or "livre" in fr.lower()
        assert "book" in en.lower() or "stor" in en.lower()
        assert len({ar, fr, en}) == 3

    @pytest.mark.parametrize("lang", LOCALIZED)
    def test_book_list_uses_titles_in_page_language(self, lang: Language) -> None:
        body = _page(lang).body_html
        assert f'<a href="/books/b1">{TITLES[lang]}</a>' in body
        assert TITLES[Language.DE] not in body

    def test_falls_back_to_german_title_when_translation_missing(self) -> None:
        only_de = _book("b9", titles={Language.DE: "Nur auf Deutsch"})
        body = _page(Language.FR, books=[only_de]).body_html
        assert '<a href="/books/b9" lang="de">Nur auf Deutsch</a>' in body

    def test_daily_book_is_linked_in_page_language(self) -> None:
        body = _page(Language.AR).body_html
        assert f'href="/books/d1">{TITLES[Language.AR]}</a>' in body

    @pytest.mark.parametrize("lang", [Language.DE, *LOCALIZED])
    def test_language_switcher_links_all_variants(self, lang: Language) -> None:
        page = (
            home_page(BASE, None, [], PRICES)
            if lang == Language.DE
            else language_home_page(BASE, lang, None, [], PRICES)
        )
        for code, path in (("de", "/"), ("ar", "/ar"), ("fr", "/fr"), ("en", "/en")):
            assert f'<a href="{path}" hreflang="{code}" lang="{code}">' in page.body_html

    def test_links_pricing_and_library(self) -> None:
        body = _page(Language.EN).body_html
        assert 'href="/pricing"' in body and 'href="/library"' in body

    def test_empty_catalogue_still_renders_value_proposition(self) -> None:
        body = language_home_page(BASE, Language.FR, None, [], PRICES).body_html
        assert "<h1>" in body and "<ul></ul>" not in body

    def test_ai_generated_titles_are_escaped(self) -> None:
        evil = {Language.AR: "<script>alert(1)</script>", Language.DE: "x"}
        page = _page(Language.AR, books=[_book("e1", titles=evil)])
        assert "<script>alert(1)" not in page.body_html
        assert "&lt;script&gt;" in page.body_html

    def test_no_invented_social_proof(self) -> None:
        # Keine erfundenen Bewertungen oder Nutzerzahlen
        for lang in LOCALIZED:
            page = _page(lang)
            types = {n["@type"] for n in _json_ld(page.head_html())}
            assert "AggregateRating" not in types and "Review" not in types
            assert "ratingValue" not in page.head_html()

    def test_german_variant_is_the_existing_home_page(self) -> None:
        # Deutsch bleibt die bestehende Startseite unter /
        page = language_home_page(BASE, Language.DE, None, [], PRICES)
        assert f'<link rel="canonical" href="{BASE}/">' in page.head_html()


# ---------------------------------------------------------------------------
# Sitemap + llms.txt
# ---------------------------------------------------------------------------

SM = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
XHTML = "{http://www.w3.org/1999/xhtml}"


class TestSitemapAlternates:
    def test_language_pages_are_listed(self) -> None:
        xml = sitemap_xml(BASE, [_book()])
        for path in ("/ar", "/fr", "/en"):
            assert f"<loc>{BASE}{path}</loc>" in xml

    def test_every_language_variant_lists_all_alternates(self) -> None:
        root = ET.fromstring(sitemap_xml(BASE, [_book()]))
        entries = {u.findtext(f"{SM}loc"): u for u in root.findall(f"{SM}url")}
        for path in PATHS.values():
            url = entries[f"{BASE}{path}"]
            alternates = {
                link.get("hreflang"): link.get("href")
                for link in url.findall(f"{XHTML}link")
                if link.get("rel") == "alternate"
            }
            assert alternates == EXPECTED_HREFLANG

    def test_book_entries_have_no_language_alternates(self) -> None:
        root = ET.fromstring(sitemap_xml(BASE, [_book()]))
        book = next(
            u for u in root.findall(f"{SM}url") if u.findtext(f"{SM}loc") == f"{BASE}/books/b1"
        )
        assert book.findall(f"{XHTML}link") == []


class TestLlmsTxtLanguages:
    def test_lists_language_pages(self) -> None:
        txt = llms_txt(BASE, [_book()], PRICES)
        for path in ("/ar", "/fr", "/en"):
            assert f"({BASE}{path})" in txt
        assert "العربية" in txt and "Français" in txt and "English" in txt
