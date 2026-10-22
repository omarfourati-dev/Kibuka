"""TDD RED: Lesefortschritt und Kinderprofile lagen in In-Memory-Dicts —
jeder Deploy/Neustart löschte Nutzerdaten. Jetzt echte SQL-Repositories.

Wie in test_book_repository_sql: echte async-Engine, Seed- und Lese-Session
getrennt (frische Identity Map wie im echten Request).
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from src.adapters.output.persistence.models import (
    BookModel,
    ChildProfileModel,
    ReadingProgressModel,
    UserModel,
)
from src.adapters.output.persistence.repositories.child_profile_repository import (
    SqlChildProfileRepository,
)
from src.adapters.output.persistence.repositories.reading_progress_repository import (
    SqlReadingProgressRepository,
)
from src.core.domain.entities.child_profile import ChildProfile, ReadingProgress
from src.core.domain.value_objects.language import Language

_TABLES = [
    m.__table__  # type: ignore[attr-defined]
    for m in (UserModel, BookModel, ChildProfileModel, ReadingProgressModel)
]


@pytest.fixture
async def session_maker() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: BookModel.metadata.create_all(sync_conn, tables=_TABLES)
        )
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


class TestChildProfileRepository:
    async def test_save_and_list_by_user(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        async with session_maker() as s:
            repo = SqlChildProfileRepository(session=s)
            await repo.save(
                ChildProfile(
                    id="p1",
                    user_id="u1",
                    name="Mia",
                    age=5,
                    preferred_languages=[Language.DE, Language.AR],
                    avatar_emoji="🦊",
                )
            )
            await s.commit()

        async with session_maker() as s:
            repo = SqlChildProfileRepository(session=s)
            profiles = await repo.list_by_user("u1")

        assert len(profiles) == 1
        assert profiles[0].name == "Mia"
        assert profiles[0].preferred_languages == [Language.DE, Language.AR]
        assert profiles[0].avatar_emoji == "🦊"

    async def test_list_excludes_other_users_and_soft_deleted(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        from datetime import UTC, datetime

        async with session_maker() as s:
            repo = SqlChildProfileRepository(session=s)
            await repo.save(ChildProfile(id="p1", user_id="u1", name="Mia", age=5))
            await repo.save(ChildProfile(id="p2", user_id="u2", name="Ben", age=7))
            await repo.save(
                ChildProfile(
                    id="p3",
                    user_id="u1",
                    name="Alt",
                    age=9,
                    deleted_at=datetime.now(UTC),
                )
            )
            await s.commit()

        async with session_maker() as s:
            repo = SqlChildProfileRepository(session=s)
            profiles = await repo.list_by_user("u1")

        assert [p.id for p in profiles] == ["p1"]

    async def test_save_updates_existing_profile(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        async with session_maker() as s:
            repo = SqlChildProfileRepository(session=s)
            await repo.save(ChildProfile(id="p1", user_id="u1", name="Mia", age=5))
            await s.commit()

        async with session_maker() as s:
            repo = SqlChildProfileRepository(session=s)
            profile = (await repo.list_by_user("u1"))[0]
            profile.name = "Mia Neu"
            profile.age = 6
            await repo.save(profile)
            await s.commit()

        async with session_maker() as s:
            repo = SqlChildProfileRepository(session=s)
            updated = (await repo.list_by_user("u1"))[0]

        assert updated.name == "Mia Neu"
        assert updated.age == 6


class TestReadingProgressRepository:
    async def test_upsert_creates_then_updates(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        async with session_maker() as s:
            repo = SqlReadingProgressRepository(session=s)
            await repo.upsert(ReadingProgress(id="rp1", user_id="u1", book_id="b1", current_page=2))
            await s.commit()

        async with session_maker() as s:
            repo = SqlReadingProgressRepository(session=s)
            await repo.upsert(
                ReadingProgress(id="ignored", user_id="u1", book_id="b1", current_page=5)
            )
            await s.commit()

        async with session_maker() as s:
            repo = SqlReadingProgressRepository(session=s)
            progress = await repo.get("u1", "b1")

        assert progress is not None
        assert progress.current_page == 5

    async def test_get_returns_none_without_progress(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        async with session_maker() as s:
            repo = SqlReadingProgressRepository(session=s)
            assert await repo.get("u1", "b1") is None

    async def test_progress_is_per_user(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        async with session_maker() as s:
            repo = SqlReadingProgressRepository(session=s)
            await repo.upsert(ReadingProgress(id="rp1", user_id="u1", book_id="b1", current_page=3))
            await s.commit()

        async with session_maker() as s:
            repo = SqlReadingProgressRepository(session=s)
            assert await repo.get("u2", "b1") is None
