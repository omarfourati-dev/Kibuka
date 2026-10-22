"""TDD RED: Kündigungen werden dauerhaft gespeichert (Nachweis des Zugangs)."""

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from src.adapters.output.persistence.models import ContractCancellationModel
from src.adapters.output.persistence.repositories.contract_cancellation_repository import (
    SqlContractCancellationRepository,
)
from src.core.domain.entities.cancellation import (
    CancellationKind,
    CancellationOutcome,
    ContractCancellation,
)

_TABLES = [ContractCancellationModel.__table__]  # type: ignore[attr-defined]


@pytest.fixture
async def session_maker() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(
        "sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda c: ContractCancellationModel.metadata.create_all(c, tables=_TABLES)
        )
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


@pytest.mark.asyncio
async def test_add_persists_every_field(
    session_maker: async_sessionmaker[AsyncSession],
) -> None:
    cancellation = ContractCancellation(
        id="c1",
        name="Omar",
        email="omar@example.com",
        kind=CancellationKind.EXTRAORDINARY,
        reason="Umzug",
        contract_reference="sub_123",
        received_at=datetime(2026, 10, 22, 18, 30, tzinfo=UTC),
        outcome=CancellationOutcome.MANUAL_REVIEW,
        user_id="u1",
        stripe_subscription_id="sub_123",
        effective_at=None,
    )
    async with session_maker() as session:
        await SqlContractCancellationRepository(session).add(cancellation)
        await session.commit()

    # Frische Session: wirklich in der DB, nicht nur im Identity-Map-Cache
    async with session_maker() as session:
        model = (await session.execute(select(ContractCancellationModel))).scalar_one()

    assert model.id == "c1"
    assert model.email == "omar@example.com"
    assert model.kind == "extraordinary"
    assert model.reason == "Umzug"
    assert model.contract_reference == "sub_123"
    assert model.outcome == "manual_review"
    assert model.user_id == "u1"
    assert model.stripe_subscription_id == "sub_123"
    assert model.received_at.replace(tzinfo=UTC) == datetime(2026, 10, 22, 18, 30, tzinfo=UTC)
