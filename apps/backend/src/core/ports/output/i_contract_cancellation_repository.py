from __future__ import annotations

from abc import ABC, abstractmethod

from ...domain.entities.cancellation import ContractCancellation


class IContractCancellationRepository(ABC):
    @abstractmethod
    async def add(self, cancellation: ContractCancellation) -> ContractCancellation: ...
