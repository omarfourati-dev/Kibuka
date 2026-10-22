"""TDD RED: Nutzer-Abos (Monat/Jahr) brauchen ein persistentes Repository.

Status kommt ausschließlich aus Stripe-Webhooks (customer.subscription.*),
upsert per stripe_subscription_id.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from src.adapters.output.persistence.models import BookSubscriptionModel, UserModel
from src.adapters.output.persistence.repositories.book_subscription_repository import (
    SqlBookSubscriptionRepository,
)
from src.core.domain.entities.purchase import BookSubscription, BookSubscriptionStatus

_TABLES = [m.__table__ for m in (UserModel, BookSubscriptionModel)]  # type: ignore[attr-defined]


@pytest.fixture
async def session_maker() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(
        "sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: BookSubscriptionModel.metadata.create_all(c, tables=_TABLES))
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


def _sub(
    sub_id: str = "s1",
    user_id: str = "u1",
    status: BookSubscriptionStatus = BookSubscriptionStatus.ACTIVE,
    stripe_id: str = "sub_123",
) -> BookSubscription:
    return BookSubscription(
        id=sub_id,
        user_id=user_id,
        plan="monthly",
        status=status,
        stripe_subscription_id=stripe_id,
        stripe_customer_id="cus_1",
        current_period_end=datetime.now(UTC) + timedelta(days=30),
    )


class TestBookSubscriptionRepository:
    async def test_active_subscription_is_found_for_user(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        async with session_maker() as s:
            await SqlBookSubscriptionRepository(s).upsert_by_stripe_id(_sub())
            await s.commit()

        async with session_maker() as s:
            found = await SqlBookSubscriptionRepository(s).get_current_for_user("u1")

        assert found is not None
        assert found.is_active
        assert found.stripe_customer_id == "cus_1"

    async def test_upsert_updates_status_by_stripe_id(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        async with session_maker() as s:
            await SqlBookSubscriptionRepository(s).upsert_by_stripe_id(_sub())
            await s.commit()

        async with session_maker() as s:
            await SqlBookSubscriptionRepository(s).upsert_by_stripe_id(
                _sub(sub_id="ignored", status=BookSubscriptionStatus.CANCELED)
            )
            await s.commit()

        async with session_maker() as s:
            found = await SqlBookSubscriptionRepository(s).get_by_stripe_id("sub_123")

        assert found is not None
        assert found.status == BookSubscriptionStatus.CANCELED
        assert not found.is_active

    async def test_current_for_user_prefers_active_over_canceled(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        async with session_maker() as s:
            repo = SqlBookSubscriptionRepository(s)
            await repo.upsert_by_stripe_id(
                _sub("old", status=BookSubscriptionStatus.CANCELED, stripe_id="sub_old")
            )
            await repo.upsert_by_stripe_id(_sub("new", stripe_id="sub_new"))
            await s.commit()

        async with session_maker() as s:
            found = await SqlBookSubscriptionRepository(s).get_current_for_user("u1")

        assert found is not None
        assert found.stripe_subscription_id == "sub_new"

    async def test_no_subscription_returns_none(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        async with session_maker() as s:
            assert await SqlBookSubscriptionRepository(s).get_current_for_user("u1") is None
