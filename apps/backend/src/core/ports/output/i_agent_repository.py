from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional
from ...domain.entities.agent_run import AgentRun, AgentStep


class IAgentRepository(ABC):
    @abstractmethod
    async def get_by_id(self, run_id: str) -> Optional[AgentRun]: ...

    @abstractmethod
    async def list_by_space(self, space_id: str) -> list[AgentRun]: ...

    @abstractmethod
    async def save(self, run: AgentRun) -> AgentRun: ...

    @abstractmethod
    async def add_step(self, step: AgentStep) -> AgentStep: ...
