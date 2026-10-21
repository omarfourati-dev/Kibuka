"""Books API endpoints — public catalog + protected reading."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from src.adapters.input.api.dependencies import get_current_user, get_optional_current_user
from src.core.domain.entities.book import Book, BookPage
from src.core.domain.value_objects.language import AgeRange, BookTheme, Language
from src.core.ports.output.i_book_repository import IBookRepository

__all__ = ["get_current_user", "get_optional_current_user", "router"]

router = APIRouter(prefix="/books", tags=["books"])

# ---------------------------------------------------------------------------
# In-memory progress store (per-process; placeholder until full persistence)
# key: (book_id, user_id) → current_page
# ---------------------------------------------------------------------------
_progress_store: dict[tuple[str, str], int] = {}


# ---------------------------------------------------------------------------
# Dependency helpers
# ---------------------------------------------------------------------------


async def get_book_repository() -> IBookRepository:
    """Override this dependency in the DI container or tests."""
    raise NotImplementedError("Wire IBookRepository via dependency override")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class WordTimestampResponse(BaseModel):
    word: str
    start_time_ms: int
    end_time_ms: int


class PageContentResponse(BaseModel):
    language: str
    text: str
    audio_url: str | None = None
    word_timestamps: list[WordTimestampResponse] = []


class BookPageResponse(BaseModel):
    page_number: int
    illustration_url: str | None = None
    contents: list[PageContentResponse] = []


class BookSummaryResponse(BaseModel):
    id: str
    theme: str
    age_range: str
    cover_image_url: str | None = None
    is_daily_book: bool
    published_at: str
    page_count: int
    price_single: float
    titles: dict[str, str]


class BookDetailResponse(BookSummaryResponse):
    preview_pages: list[BookPageResponse]
    is_purchased: bool


class BookFullResponse(BookSummaryResponse):
    pages: list[BookPageResponse]


class PaginatedBooksResponse(BaseModel):
    books: list[BookSummaryResponse]
    total: int
    page: int
    page_size: int


class ProgressRequest(BaseModel):
    current_page: int
    child_profile_id: str | None = None


class ProgressResponse(BaseModel):
    book_id: str
    current_page: int
    completed: bool


# ---------------------------------------------------------------------------
# Mapping helpers
# ---------------------------------------------------------------------------


def _page_to_response(page: BookPage) -> BookPageResponse:
    p: BookPage = page
    contents = [
        PageContentResponse(
            language=str(c.language),
            text=c.text,
            audio_url=c.audio_url,
            word_timestamps=[
                WordTimestampResponse(
                    word=ts.word,
                    start_time_ms=ts.start_time_ms,
                    end_time_ms=ts.end_time_ms,
                )
                for ts in c.word_timestamps
            ],
        )
        for c in p.contents
    ]
    return BookPageResponse(
        page_number=p.page_number,
        illustration_url=p.illustration_url,
        contents=contents,
    )


def _book_to_summary(book: Book) -> BookSummaryResponse:
    return BookSummaryResponse(
        id=book.id,
        theme=str(book.theme),
        age_range=str(book.age_range),
        cover_image_url=book.cover_image_url,
        is_daily_book=book.is_daily_book,
        published_at=book.published_at.isoformat(),
        page_count=book.page_count,
        price_single=book.price_single,
        titles={str(t.language): t.title for t in book.translations},
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/daily", response_model=BookSummaryResponse)
async def get_daily_book(
    repo: Annotated[IBookRepository, Depends(get_book_repository)],
    _user: Annotated[str | None, Depends(get_optional_current_user)] = None,
) -> BookSummaryResponse:
    """Return today's free daily book. Public endpoint."""
    book = await repo.get_daily_book()
    if book is None:
        raise HTTPException(status_code=404, detail="No daily book available")
    return _book_to_summary(book)


@router.get("", response_model=PaginatedBooksResponse)
async def list_books(
    repo: Annotated[IBookRepository, Depends(get_book_repository)],
    _user: Annotated[str | None, Depends(get_optional_current_user)] = None,
    language: Annotated[Language | None, Query()] = None,
    age_range: Annotated[AgeRange | None, Query()] = None,
    theme: Annotated[BookTheme | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedBooksResponse:
    """List all books with optional filters. Public endpoint."""
    books, total = await repo.list_books(
        language=language,
        age_range=age_range,
        theme=theme,
        page=page,
        page_size=page_size,
    )
    return PaginatedBooksResponse(
        books=[_book_to_summary(b) for b in books],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{book_id}", response_model=BookDetailResponse)
async def get_book_detail(
    book_id: str,
    repo: Annotated[IBookRepository, Depends(get_book_repository)],
    user_id: Annotated[str | None, Depends(get_optional_current_user)] = None,
) -> BookDetailResponse:
    """Return book detail with first 2 preview pages. Public endpoint."""
    book = await repo.get_by_id(book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")

    is_purchased = False
    if user_id:
        is_purchased = await repo.is_purchased_by_user(book_id, user_id)

    # Sort pages by page_number and return first 2 as preview
    sorted_pages = sorted(book.pages, key=lambda p: p.page_number)
    preview_pages = [_page_to_response(p) for p in sorted_pages[:2]]

    summary = _book_to_summary(book)
    return BookDetailResponse(
        **summary.model_dump(),
        preview_pages=preview_pages,
        is_purchased=is_purchased,
    )


@router.get("/{book_id}/read", response_model=BookFullResponse)
async def read_book(
    book_id: str,
    repo: Annotated[IBookRepository, Depends(get_book_repository)],
    user_id: Annotated[str, Depends(get_current_user)],
) -> BookFullResponse:
    """Return full book content. Requires auth + purchase or active subscription."""
    book = await repo.get_by_id(book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")

    has_access = await repo.is_purchased_by_user(book_id, user_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Purchase required",
        )

    sorted_pages = sorted(book.pages, key=lambda p: p.page_number)
    pages = [_page_to_response(p) for p in sorted_pages]

    summary = _book_to_summary(book)
    return BookFullResponse(**summary.model_dump(), pages=pages)


@router.put("/{book_id}/progress", response_model=ProgressResponse)
async def update_progress(
    book_id: str,
    body: ProgressRequest,
    repo: Annotated[IBookRepository, Depends(get_book_repository)],
    user_id: Annotated[str, Depends(get_current_user)],
) -> ProgressResponse:
    """Save reading progress for authenticated user."""
    book = await repo.get_by_id(book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")

    _progress_store[(book_id, user_id)] = body.current_page
    completed = body.current_page >= book.page_count

    return ProgressResponse(
        book_id=book_id,
        current_page=body.current_page,
        completed=completed,
    )


@router.get("/{book_id}/progress", response_model=ProgressResponse)
async def get_progress(
    book_id: str,
    repo: Annotated[IBookRepository, Depends(get_book_repository)],
    user_id: Annotated[str, Depends(get_current_user)],
) -> ProgressResponse:
    """Get reading progress for authenticated user."""
    book = await repo.get_by_id(book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")

    current_page = _progress_store.get((book_id, user_id), 0)
    completed = current_page >= book.page_count if current_page > 0 else False

    return ProgressResponse(
        book_id=book_id,
        current_page=current_page,
        completed=completed,
    )
