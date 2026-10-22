"""SEO/GEO-Endpunkte: HTML-Fragmente für nginx-SSI, Sitemap und llms.txt.

nginx bindet für jede Seitenanfrage `/__seo/head<pfad>` und `/__seo/body<pfad>`
per SSI in index.html ein (siehe apps/frontend/nginx.conf). Öffentlich und
ohne Login — es wird ausschließlich ohnehin öffentlicher Inhalt gerendert.
"""

from __future__ import annotations

import re
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.input.seo.renderer import (
    Prices,
    SeoPage,
    book_page,
    home_page,
    library_page,
    llms_txt,
    noindex_page,
    pricing_page,
    sitemap_xml,
)
from src.adapters.output.persistence.repositories.book_repository import SqlBookRepository
from src.core.domain.entities.book import Book
from src.core.ports.output.i_book_repository import IBookRepository
from src.infrastructure.config import settings
from src.infrastructure.database import get_db

router = APIRouter(prefix="/seo", tags=["seo"])

# Buch-IDs sind UUIDs; alles andere ist kein gültiges Buch (spart DB-Abfragen)
_BOOK_PATH = re.compile(r"^/books/([0-9A-Za-z-]{1,64})$")
_MAX_SITEMAP_BOOKS = 1000
_HOME_BOOKS = 12


async def get_seo_book_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> IBookRepository:
    """Real SQL wiring; tests replace this via dependency override."""
    return SqlBookRepository(session=session)


def _base() -> str:
    return settings.app_url.rstrip("/")


def _prices() -> Prices:
    return Prices(
        single=settings.book_price_single_eur,
        monthly=settings.subscription_price_monthly_eur,
        yearly=settings.subscription_price_yearly_eur,
        trial_days=settings.subscription_trial_days,
    )


def _normalize(path: str) -> str:
    path = "/" + path.strip("/")
    return path


async def _all_books(repo: IBookRepository, limit: int) -> list[Book]:
    books, _ = await repo.list_books(page=1, page_size=min(limit, 100))
    collected = list(books)
    page = 2
    while len(collected) < limit and len(books) == 100:
        books, _ = await repo.list_books(page=page, page_size=100)
        collected.extend(books)
        page += 1
    return collected[:limit]


async def _resolve(path: str, repo: IBookRepository) -> SeoPage | None:
    """None = private/unbekannte Seite (noindex, kein Inhalt)."""
    base, prices = _base(), _prices()
    path = _normalize(path)
    if path == "/":
        daily = await repo.get_daily_book()
        books = await _all_books(repo, _HOME_BOOKS)
        return home_page(base, daily, books, prices)
    if path in ("/library", "/books"):
        return library_page(base, await _all_books(repo, _MAX_SITEMAP_BOOKS), prices)
    if path == "/pricing":
        return pricing_page(base, prices)
    match = _BOOK_PATH.match(path)
    if match:
        book = await repo.get_by_id(match.group(1))
        return book_page(base, book, prices) if book else None
    return None


@router.get("/head/{path:path}", response_class=HTMLResponse)
async def seo_head(
    path: str, repo: Annotated[IBookRepository, Depends(get_seo_book_repository)]
) -> HTMLResponse:
    page = await _resolve(path, repo) or noindex_page(_base(), _normalize(path))
    return HTMLResponse(page.head_html())


@router.get("/body/{path:path}", response_class=HTMLResponse)
async def seo_body(
    path: str, repo: Annotated[IBookRepository, Depends(get_seo_book_repository)]
) -> HTMLResponse:
    page = await _resolve(path, repo)
    return HTMLResponse(page.body_html if page else "")


@router.get("/sitemap.xml")
async def seo_sitemap(
    repo: Annotated[IBookRepository, Depends(get_seo_book_repository)],
) -> Response:
    xml = sitemap_xml(_base(), await _all_books(repo, _MAX_SITEMAP_BOOKS))
    return Response(
        xml,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/llms.txt")
async def seo_llms(
    repo: Annotated[IBookRepository, Depends(get_seo_book_repository)],
) -> PlainTextResponse:
    txt = llms_txt(_base(), await _all_books(repo, 200), _prices())
    return PlainTextResponse(txt, headers={"Cache-Control": "public, max-age=3600"})
