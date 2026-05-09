from __future__ import annotations
import uuid
from dataclasses import dataclass
from typing import Any
from ...domain.entities.agent_run import AgentRun, AgentStatus
from ...domain.exceptions.ai import AIFeatureDisabledError
from ...ports.output.i_agent_repository import IAgentRepository


@dataclass
class RunAgentCommand:
    space_id: str
    user_id: str
    task: str
    available_tools: list[str]
    context: dict[str, Any] | None = None


class RunAgentUseCase:
    def __init__(
        self,
        agent_repo: IAgentRepository,
        enable_agents: bool = True,
    ) -> None:
        self._agent_repo = agent_repo
        self._enable_agents = enable_agents

    async def execute(self, command: RunAgentCommand) -> AgentRun:
        if not self._enable_agents:
            raise AIFeatureDisabledError("Agent features are disabled")

        run = AgentRun(
            id=str(uuid.uuid4()),
            space_id=command.space_id,
            user_id=command.user_id,
            task=command.task,
            available_tools=command.available_tools,
            status=AgentStatus.RUNNING,
        )
        return await self._agent_repo.save(run)
