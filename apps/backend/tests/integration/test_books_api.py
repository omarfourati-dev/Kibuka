"""Integration tests for Books API endpoints — written FIRST (TDD RED phase)."""

from __future__ import annotations

from datetime import datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.core.domain.entities.book import (
    Book,
    BookPage,
    BookTranslation,
    PageContent,
    WordTimestamp,
)
from src.core.domain.entities.user import User, UserRole, UserStatus
from src.core.domain.value_objects.language import AgeRange, BookTheme, Language
from src.core.ports.output.i_book_repository import IBookRepository

# ---------------------------------------------------------------------------
# Helpers / Factories
# ---------------------------------------------------------------------------


def _make_book(
    book_id: str = "book-1",
    is_daily: bool = False,
    with_pages: bool = True,
) -> Book:
    page = BookPage(
        id="page-1",
        book_id=book_id,
        page_number=1,
        illustration_url="https://cdn.example.com/page1.png",
        contents=[
            PageContent(
                page_id="page-1",
                language=Language.DE,
                text="Der kleine Löwe geht auf Abenteuer.",
                audio_url="https://cdn.example.com/audio-de.mp3",
                word_timestamps=[
                    WordTimestamp(word="Der", start_time_ms=0, end_time_ms=200),
                    WordTimestamp(word="kleine", start_time_ms=210, end_time_ms=450),
                ],
            )
        ],
    )
    page2 = BookPage(
        id="page-2",
        book_id=book_id,
        page_number=2,
        illustration_url="https://cdn.example.com/page2.png",
        contents=[
            PageContent(
                page_id="page-2",
                language=Language.DE,
                text="Er trifft einen Elefanten.",
            )
        ],
    )
    page3 = BookPage(
        id="page-3",
        book_id=book_id,
        page_number=3,
        contents=[],
    )
    return Book(
        id=book_id,
        theme=BookTheme.ANIMALS,
        age_range=AgeRange.YOUNG,
        page_count=3,
        price_single=1.99,
        published_at=datetime(2024, 1, 15, 12, 0, 0),
        is_daily_book=is_daily,
        cover_image_url="https://cdn.example.com/cover.png",
        translations=[
            BookTranslation(book_id=book_id, language=Language.DE, title="Der kleine Löwe"),
            BookTranslation(book_id=book_id, language=Language.EN, title="The Little Lion"),
        ],
        pages=[page, page2, page3] if with_pages else [],
    )


class MockBookRepository(IBookRepository):
    """In-memory book repository for testing."""

    def __init__(self) -> None:
        self._books: dict[str, Book] = {}
        self._daily_book_id: str | None = None
        self._purchased: set[tuple[str, str]] = set()  # (book_id, user_id)
        self._progress: dict[tuple[str, str], int] = {}  # (book_id, user_id) -> page

    async def get_by_id(self, book_id: str) -> Book | None:
        return self._books.get(book_id)

    async def get_daily_book(self) -> Book | None:
        if self._daily_book_id:
            return self._books.get(self._daily_book_id)
        return None

    async def list_books(
        self,
        language: Language | None = None,
        age_range: AgeRange | None = None,
        theme: BookTheme | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Book], int]:
        books = list(self._books.values())
        if age_range:
            books = [b for b in books if b.age_range == age_range]
        if theme:
            books = [b for b in books if b.theme == theme]
        total = len(books)
        start = (page - 1) * page_size
        end = start + page_size
        return books[start:end], total

    async def save(self, book: Book) -> Book:
        self._books[book.id] = book
        return book

    async def set_daily_book(self, book_id: str) -> None:
        self._daily_book_id = book_id

    async def is_purchased_by_user(self, book_id: str, user_id: str) -> bool:
        return (book_id, user_id) in self._purchased

    async def record_purchase(self, purchase) -> None:  # noqa: ANN001
        self._purchased.add((purchase.book_id, purchase.user_id))

    def add_book(self, book: Book) -> None:
        self._books[book.id] = book

    def set_purchased(self, book_id: str, user_id: str) -> None:
        self._purchased.add((book_id, user_id))


# ---------------------------------------------------------------------------
# App fixture
# ---------------------------------------------------------------------------


VALID_TOKEN = "test-token-user-1"
USER_ID = "user-1"


@pytest.fixture()
def book_repo() -> MockBookRepository:
    repo = MockBookRepository()
    book = _make_book(book_id="book-1", is_daily=True)
    repo.add_book(book)
    repo._daily_book_id = "book-1"

    book2 = _make_book(book_id="book-2")
    repo.add_book(book2)
    return repo


class FakeUserRepo:
    """User lookup stand-in for the admin-bypass checks."""

    def __init__(
        self, role: UserRole = UserRole.MEMBER, status: UserStatus = UserStatus.ACTIVE
    ) -> None:
        self._role = role
        self._status = status

    async def get_by_id(self, user_id: str) -> User:
        return User(
            id=user_id,
            email=f"{user_id}@example.com",
            name="Test",
            role=self._role,
            status=self._status,
        )


def _build_client(
    book_repo: MockBookRepository,
    optional_user: str | None,
    auth_user: str = USER_ID,
    user_repo: FakeUserRepo | None = None,
) -> TestClient:
    from src.adapters.input.api.dependencies import get_user_repository
    from src.adapters.input.api.v1.books import (
        get_book_repository,
        get_current_user,
        get_optional_current_user,
    )
    from src.adapters.input.api.v1.books import router as books_router

    app = FastAPI()
    app.include_router(books_router, prefix="/api/v1")

    app.dependency_overrides[get_book_repository] = lambda: book_repo
    app.dependency_overrides[get_optional_current_user] = lambda: optional_user
    app.dependency_overrides[get_current_user] = lambda: auth_user
    app.dependency_overrides[get_user_repository] = lambda: user_repo or FakeUserRepo()

    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture()
def client(book_repo: MockBookRepository) -> TestClient:
    """Unauthenticated client."""
    return _build_client(book_repo, optional_user=None)


@pytest.fixture()
def authed_client(book_repo: MockBookRepository) -> TestClient:
    """Authenticated client — current user = USER_ID (regular member)."""
    return _build_client(book_repo, optional_user=USER_ID)


@pytest.fixture()
def admin_client(book_repo: MockBookRepository) -> TestClient:
    """Authenticated client whose user is an active admin."""
    return _build_client(
        book_repo, optional_user=USER_ID, user_repo=FakeUserRepo(role=UserRole.ADMIN)
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestGetDailyBook:
    def test_get_daily_book_returns_200(self, client: TestClient) -> None:
        response = client.get("/api/v1/books/daily")
        assert response.status_code == 200

    def test_get_daily_book_returns_book_fields(self, client: TestClient) -> None:
        response = client.get("/api/v1/books/daily")
        data = response.json()
        assert data["id"] == "book-1"
        assert data["theme"] == "animals"
        assert data["age_range"] == "3-5"
        assert data["is_daily_book"] is True
        assert "titles" in data
        assert data["titles"]["de"] == "Der kleine Löwe"

    def test_get_daily_book_returns_404_when_no_daily_book(
        self, book_repo: MockBookRepository
    ) -> None:
        from src.adapters.input.api.v1.books import (
            get_book_repository,
            get_current_user,
            get_optional_current_user,
        )
        from src.adapters.input.api.v1.books import router as books_router

        book_repo._daily_book_id = None

        app = FastAPI()
        app.include_router(books_router, prefix="/api/v1")

        async def _repo() -> MockBookRepository:
            return book_repo

        async def _no_user() -> str | None:
            return None

        async def _user() -> str:
            return USER_ID

        app.dependency_overrides[get_book_repository] = _repo
        app.dependency_overrides[get_optional_current_user] = _no_user
        app.dependency_overrides[get_current_user] = _user

        c = TestClient(app, raise_server_exceptions=False)
        response = c.get("/api/v1/books/daily")
        assert response.status_code == 404


class TestGetBooksList:
    def test_get_books_list_returns_200(self, client: TestClient) -> None:
        response = client.get("/api/v1/books")
        assert response.status_code == 200

    def test_get_books_list_returns_paginated_response(self, client: TestClient) -> None:
        response = client.get("/api/v1/books")
        data = response.json()
        assert "books" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert data["page"] == 1
        assert data["total"] == 2

    def test_get_books_list_filters_by_theme(self, client: TestClient) -> None:
        response = client.get("/api/v1/books?theme=animals")
        assert response.status_code == 200
        data = response.json()
        for book in data["books"]:
            assert book["theme"] == "animals"

    def test_get_books_list_filters_by_age_range(self, client: TestClient) -> None:
        response = client.get("/api/v1/books?age_range=3-5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["books"], list)

    def test_get_books_list_pagination(self, client: TestClient) -> None:
        response = client.get("/api/v1/books?page=1&page_size=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data["books"]) == 1
        assert data["page_size"] == 1


class TestGetBookDetail:
    def test_get_book_detail_returns_200(self, client: TestClient) -> None:
        response = client.get("/api/v1/books/book-1")
        assert response.status_code == 200

    def test_get_book_detail_returns_preview_pages_only(self, client: TestClient) -> None:
        """Detail endpoint returns only first 2 pages as preview."""
        response = client.get("/api/v1/books/book-1")
        data = response.json()
        assert "preview_pages" in data
        assert len(data["preview_pages"]) <= 2

    def test_get_book_detail_returns_is_purchased_false_for_anon(self, client: TestClient) -> None:
        response = client.get("/api/v1/books/book-1")
        data = response.json()
        assert data["is_purchased"] is False

    def test_get_book_detail_returns_is_purchased_true_when_purchased(
        self, authed_client: TestClient, book_repo: MockBookRepository
    ) -> None:
        book_repo.set_purchased("book-1", USER_ID)
        response = authed_client.get("/api/v1/books/book-1")
        data = response.json()
        assert data["is_purchased"] is True

    def test_get_book_detail_returns_404_for_unknown_book(self, client: TestClient) -> None:
        response = client.get("/api/v1/books/nonexistent")
        assert response.status_code == 404


class TestGetBookRead:
    def test_get_book_read_without_auth_returns_401(self, client: TestClient) -> None:
        """Unauthenticated users cannot read full book — but client has overridden get_current_user
        so we need a special client that does NOT override get_current_user."""
        from src.adapters.input.api.v1.books import get_book_repository, get_optional_current_user
        from src.adapters.input.api.v1.books import router as books_router

        app = FastAPI()
        app.include_router(books_router, prefix="/api/v1")

        book_repo_local = MockBookRepository()
        book_repo_local.add_book(_make_book(book_id="book-1"))

        async def _repo() -> MockBookRepository:
            return book_repo_local

        async def _no_user() -> str | None:
            return None

        # Do NOT override get_current_user — let it return 401 naturally
        app.dependency_overrides[get_book_repository] = _repo
        app.dependency_overrides[get_optional_current_user] = _no_user

        c = TestClient(app, raise_server_exceptions=False)
        response = c.get("/api/v1/books/book-1/read")
        assert response.status_code == 401

    def test_get_book_read_with_auth_but_not_purchased_returns_403(
        self, authed_client: TestClient
    ) -> None:
        # book_repo has no purchase for USER_ID on book-1
        response = authed_client.get("/api/v1/books/book-1/read")
        assert response.status_code == 403

    def test_get_book_read_with_purchased_returns_full_content(
        self, authed_client: TestClient, book_repo: MockBookRepository
    ) -> None:
        book_repo.set_purchased("book-1", USER_ID)
        response = authed_client.get("/api/v1/books/book-1/read")
        assert response.status_code == 200
        data = response.json()
        assert "pages" in data
        assert len(data["pages"]) == 3  # all pages

    def test_get_book_read_returns_404_for_unknown_book(
        self, authed_client: TestClient, book_repo: MockBookRepository
    ) -> None:
        book_repo.set_purchased("unknown", USER_ID)
        response = authed_client.get("/api/v1/books/unknown/read")
        assert response.status_code == 404


class TestProgress:
    def test_update_progress_without_auth_returns_401(self, client: TestClient) -> None:
        """Requires a special client that doesn't override get_current_user."""
        from src.adapters.input.api.v1.books import get_book_repository, get_optional_current_user
        from src.adapters.input.api.v1.books import router as books_router

        app = FastAPI()
        app.include_router(books_router, prefix="/api/v1")

        book_repo_local = MockBookRepository()
        book_repo_local.add_book(_make_book(book_id="book-1"))

        async def _repo() -> MockBookRepository:
            return book_repo_local

        async def _no_user() -> str | None:
            return None

        app.dependency_overrides[get_book_repository] = _repo
        app.dependency_overrides[get_optional_current_user] = _no_user

        c = TestClient(app, raise_server_exceptions=False)
        response = c.put("/api/v1/books/book-1/progress", json={"current_page": 2})
        assert response.status_code == 401

    def test_get_progress_without_auth_returns_401(self, client: TestClient) -> None:
        from src.adapters.input.api.v1.books import get_book_repository, get_optional_current_user
        from src.adapters.input.api.v1.books import router as books_router

        app = FastAPI()
        app.include_router(books_router, prefix="/api/v1")

        book_repo_local = MockBookRepository()
        book_repo_local.add_book(_make_book(book_id="book-1"))

        async def _repo() -> MockBookRepository:
            return book_repo_local

        async def _no_user() -> str | None:
            return None

        app.dependency_overrides[get_book_repository] = _repo
        app.dependency_overrides[get_optional_current_user] = _no_user

        c = TestClient(app, raise_server_exceptions=False)
        response = c.get("/api/v1/books/book-1/progress")
        assert response.status_code == 401

    def test_update_progress_with_auth_returns_200(self, authed_client: TestClient) -> None:
        response = authed_client.put("/api/v1/books/book-1/progress", json={"current_page": 2})
        assert response.status_code == 200
        data = response.json()
        assert data["book_id"] == "book-1"
        assert data["current_page"] == 2

    def test_get_progress_with_auth_returns_200(self, authed_client: TestClient) -> None:
        response = authed_client.get("/api/v1/books/book-1/progress")
        assert response.status_code == 200
        data = response.json()
        assert data["book_id"] == "book-1"
        assert "current_page" in data
        assert "completed" in data

    def test_update_then_get_progress_returns_updated_value(
        self, authed_client: TestClient
    ) -> None:
        authed_client.put("/api/v1/books/book-1/progress", json={"current_page": 3})
        response = authed_client.get("/api/v1/books/book-1/progress")
        data = response.json()
        assert data["current_page"] == 3

    def test_progress_completed_when_on_last_page(
        self, authed_client: TestClient, book_repo: MockBookRepository
    ) -> None:
        # book-1 has 3 pages; reaching page 3 = completed
        authed_client.put("/api/v1/books/book-1/progress", json={"current_page": 3})
        response = authed_client.get("/api/v1/books/book-1/progress")
        data = response.json()
        assert data["completed"] is True


class TestAdminAccess:
    """Active admins can read every book without purchasing it."""

    def test_admin_can_read_full_book_without_purchase(self, admin_client: TestClient) -> None:
        response = admin_client.get("/api/v1/books/book-1/read")

        assert response.status_code == 200
        assert len(response.json()["pages"]) > 0

    def test_admin_sees_book_as_purchased_in_detail(self, admin_client: TestClient) -> None:
        response = admin_client.get("/api/v1/books/book-1")

        assert response.status_code == 200
        assert response.json()["is_purchased"] is True

    def test_member_without_purchase_is_still_rejected(self, authed_client: TestClient) -> None:
        response = authed_client.get("/api/v1/books/book-1/read")

        assert response.status_code == 403


class TestPageResponseShape:
    """Pages must be serialized as per-language maps — the shape the web
    reader consumes (texts/audio_urls/word_timestamps keyed by language)."""

    def test_preview_pages_use_language_maps(self, client: TestClient) -> None:
        response = client.get("/api/v1/books/book-1")

        page = response.json()["preview_pages"][0]
        assert page["texts"]["de"] == "Der kleine Löwe geht auf Abenteuer."
        assert page["audio_urls"]["de"] == "https://cdn.example.com/audio-de.mp3"
        ts = page["word_timestamps"]["de"]
        assert ts[0] == {"word": "Der", "startTime": 0, "endTime": 200}

    def test_full_read_uses_language_maps(self, admin_client: TestClient) -> None:
        response = admin_client.get("/api/v1/books/book-1/read")

        page = response.json()["pages"][0]
        assert "texts" in page and "audio_urls" in page and "word_timestamps" in page
        assert "contents" not in page
