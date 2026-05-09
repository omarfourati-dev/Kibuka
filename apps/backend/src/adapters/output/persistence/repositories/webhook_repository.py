from __future__ import annotations
from typing import Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from .....core.ports.output.i_webhook_repository import IWebhookRepository
from .....core.domain.entities.outgoing_webhook import OutgoingWebhook
from ..models import OutgoingWebhookModel


class SqlWebhookRepository(IWebhookRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, webhook_id: str) -> Optional[OutgoingWebhook]:
        result = await self._session.execute(
            select(OutgoingWebhookModel).where(OutgoingWebhookModel.id == webhook_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_space(self, space_id: str) -> list[OutgoingWebhook]:
        result = await self._session.execute(
            select(OutgoingWebhookModel)
            .where(OutgoingWebhookModel.space_id == space_id)
            .order_by(OutgoingWebhookModel.created_at.desc())
        )
        return [self._to_entity(m) for m in result.scalars().all()]

    async def list_by_event(self, event: str) -> list[OutgoingWebhook]:
        result = await self._session.execute(
            select(OutgoingWebhookModel).where(OutgoingWebhookModel.is_active.is_(True))
        )
        all_webhooks = [self._to_entity(m) for m in result.scalars().all()]
        return [w for w in all_webhooks if event in w.events]

    async def save(self, webhook: OutgoingWebhook) -> OutgoingWebhook:
        existing = await self._session.get(OutgoingWebhookModel, webhook.id)
        if existing:
            existing.name = webhook.name
            existing.url = webhook.url
            existing.events = webhook.events
            existing.secret = webhook.secret
            existing.is_active = webhook.is_active
            existing.failure_count = webhook.failure_count
            existing.circuit_open_until = webhook.circuit_open_until
        else:
            self._session.add(self._to_model(webhook))
        await self._session.flush()
        return webhook

    async def delete(self, webhook_id: str) -> None:
        await self._session.execute(
            delete(OutgoingWebhookModel).where(OutgoingWebhookModel.id == webhook_id)
        )

    def _to_entity(self, model: OutgoingWebhookModel) -> OutgoingWebhook:
        return OutgoingWebhook(
            id=model.id,
            space_id=model.space_id,
            name=model.name,
            url=model.url,
            events=model.events or [],
            secret=model.secret,
            is_active=model.is_active,
            failure_count=model.failure_count,
            circuit_open_until=model.circuit_open_until,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, webhook: OutgoingWebhook) -> OutgoingWebhookModel:
        return OutgoingWebhookModel(
            id=webhook.id,
            space_id=webhook.space_id,
            name=webhook.name,
            url=webhook.url,
            events=webhook.events,
            secret=webhook.secret,
            is_active=webhook.is_active,
            failure_count=webhook.failure_count,
            circuit_open_until=webhook.circuit_open_until,
        )
