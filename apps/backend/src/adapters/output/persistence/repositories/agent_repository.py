from __future__ import annotations
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from .....core.ports.output.i_agent_repository import IAgentRepository
from .....core.domain.entities.agent_run import AgentRun, AgentStep, AgentStatus
from ..models import AgentRunModel, AgentStepModel


class SqlAgentRepository(IAgentRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, run_id: str) -> Optional[AgentRun]:
        result = await self._session.execute(
            select(AgentRunModel).where(AgentRunModel.id == run_id)
        )
        model = result.scalar_one_or_none()
        if not model:
            return None
        steps = await self._load_steps(run_id)
        return self._to_entity(model, steps)

    async def list_by_space(self, space_id: str) -> list[AgentRun]:
        result = await self._session.execute(
            select(AgentRunModel)
            .where(AgentRunModel.space_id == space_id)
            .order_by(AgentRunModel.created_at.desc())
        )
        runs = []
        for m in result.scalars().all():
            steps = await self._load_steps(m.id)
            runs.append(self._to_entity(m, steps))
        return runs

    async def save(self, run: AgentRun) -> AgentRun:
        existing = await self._session.get(AgentRunModel, run.id)
        if existing:
            existing.status = run.status.value
            existing.result = run.result
            existing.available_tools = run.available_tools
        else:
            self._session.add(self._to_model(run))
        await self._session.flush()
        return run

    async def add_step(self, step: AgentStep) -> AgentStep:
        model = AgentStepModel(
            id=step.id,
            agent_run_id=step.agent_run_id,
            step_type=step.step_type,
            content=step.content,
            tool_name=step.tool_name,
            tool_args=step.tool_args,
            tool_result=step.tool_result,
            created_at=step.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return step

    async def _load_steps(self, run_id: str) -> list[AgentStep]:
        result = await self._session.execute(
            select(AgentStepModel)
            .where(AgentStepModel.agent_run_id == run_id)
            .order_by(AgentStepModel.created_at)
        )
        return [self._step_to_entity(m) for m in result.scalars().all()]

    def _to_entity(self, model: AgentRunModel, steps: list[AgentStep]) -> AgentRun:
        return AgentRun(
            id=model.id,
            space_id=model.space_id,
            user_id=model.user_id,
            task=model.task,
            available_tools=model.available_tools or [],
            status=AgentStatus(model.status),
            result=model.result,
            steps=steps,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, run: AgentRun) -> AgentRunModel:
        return AgentRunModel(
            id=run.id,
            space_id=run.space_id,
            user_id=run.user_id,
            task=run.task,
            available_tools=run.available_tools,
            status=run.status.value,
            result=run.result,
        )

    def _step_to_entity(self, model: AgentStepModel) -> AgentStep:
        return AgentStep(
            id=model.id,
            agent_run_id=model.agent_run_id,
            step_type=model.step_type,
            content=model.content,
            tool_name=model.tool_name,
            tool_args=model.tool_args,
            tool_result=model.tool_result,
            created_at=model.created_at,
        )
