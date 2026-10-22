"""TDD RED: SEO-Fragmente für nginx-SSI, dynamische Sitemap und llms.txt."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.adapters.input.api.v1.seo import get_seo_book_repository
from src.adapters.input.api.v1.seo import router as seo_router
from src.core.domain.entities.book import Book, BookTranslation
from src.core.domain.value_objects.language import AgeRange, BookTheme, Language
from src.infrastructure.config import settings


@pytest.fixture(autouse=True)
def _prod_domain(monkeypatch: pytest.MonkeyPatch) -> None:
    # In Produktion: APP_URL=https://kibuka.omarfourati.de (Deploy-Workflow)
    monkeypatch.setattr(settings, "app_url", "https://kibuka.omarfourati.de/")


def _book(book_id: str, title: str, daily: bool = False) -> Book:
    return Book(
        id=book_id,
        theme=BookTheme.ANIMALS,
        age_range=AgeRange.YOUNG,
        page_count=6,
        price_single=0 if daily else 2.99,
        published_at=datetime(2026, 10, 22, 6, 0, tzinfo=UTC),
        is_daily_book=daily,
        cover_image_url=f"https://kibuka.omarfourati.de/kibuka-assets/books/{book_id}/cover.webp",
        translations=[BookTranslation(book_id=book_id, language=Language.DE, title=title)],
    )


class FakeRepo:
    def __init__(self) -> None:
        self.books = {
            "d1": _book("d1", "Lilly, die kleine Füchsin", daily=True),
            "b2": _book("b2", "Lilly entdeckt die Jahreszeiten"),
        }

    async def get_by_id(self, book_id: str) -> Book | None:
        return self.books.get(book_id)

    async def get_daily_book(self) -> Book | None:
        return self.books["d1"]

    async def list_books(self, **_: object) -> tuple[list[Book], int]:
        return list(self.books.values()), len(self.books)


def _client() -> TestClient:
    app = FastAPI()
    app.include_router(seo_router, prefix="/api/v1")
    app.dependency_overrides[get_seo_book_repository] = lambda: FakeRepo()
    return TestClient(app)


class TestHeadFragment:
    def test_book_page_head(self) -> None:
        resp = _client().get("/api/v1/seo/head/books/b2")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/html")
        assert "<title>Lilly entdeckt die Jahreszeiten" in resp.text
        assert 'href="https://kibuka.omarfourati.de/books/b2"' in resp.text

    def test_home_head_for_empty_path(self) -> None:
        # nginx ruft /__seo/head$uri auf — für "/" bleibt der Pfad leer
        resp = _client().get("/api/v1/seo/head/")
        assert 'href="https://kibuka.omarfourati.de/"' in resp.text

    def test_trailing_slash_is_the_same_page(self) -> None:
        resp = _client().get("/api/v1/seo/head/pricing/")
        assert 'href="https://kibuka.omarfourati.de/pricing"' in resp.text

    def test_unknown_book_is_noindex(self) -> None:
        resp = _client().get("/api/v1/seo/head/books/nope")
        assert resp.status_code == 200
        assert 'content="noindex' in resp.text

    def test_reader_and_private_pages_are_noindex(self) -> None:
        for path in ("books/b2/read", "profile", "login", "app/settings"):
            assert 'content="noindex' in _client().get(f"/api/v1/seo/head/{path}").text


class TestBodyFragment:
    def test_book_body(self) -> None:
        resp = _client().get("/api/v1/seo/body/books/b2")
        assert "<h1>Lilly entdeckt die Jahreszeiten</h1>" in resp.text

    def test_library_body_lists_books(self) -> None:
        text = _client().get("/api/v1/seo/body/library").text
        assert 'href="/books/d1"' in text and 'href="/books/b2"' in text

    def test_noindex_pages_have_no_body(self) -> None:
        assert _client().get("/api/v1/seo/body/profile").text == ""


class TestSitemapAndLlms:
    def test_sitemap(self) -> None:
        resp = _client().get("/api/v1/seo/sitemap.xml")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("application/xml")
        assert "<loc>https://kibuka.omarfourati.de/books/b2</loc>" in resp.text

    def test_llms_txt(self) -> None:
        resp = _client().get("/api/v1/seo/llms.txt")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/plain")
        assert "Lilly entdeckt die Jahreszeiten" in resp.text
