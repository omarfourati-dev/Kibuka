from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from .....core.domain.entities.cancellation import ContractCancellation
from .....core.ports.output.i_contract_cancellation_repository import (
    IContractCancellationRepository,
)
from ..models import ContractCancellationModel


class SqlContractCancellationRepository(IContractCancellationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, cancellation: ContractCancellation) -> ContractCancellation:
        self._session.add(
            ContractCancellationModel(
                id=cancellation.id,
                name=cancellation.name,
                email=cancellation.email,
                kind=cancellation.kind.value,
                reason=cancellation.reason,
                contract_reference=cancellation.contract_reference,
                received_at=cancellation.received_at,
                outcome=cancellation.outcome.value,
                user_id=cancellation.user_id,
                stripe_subscription_id=cancellation.stripe_subscription_id,
                effective_at=cancellation.effective_at,
            )
        )
        await self._session.flush()
        return cancellation
