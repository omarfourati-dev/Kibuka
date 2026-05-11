from __future__ import annotations

import uuid
from dataclasses import dataclass

from ...domain.entities.outgoing_webhook import OutgoingWebhook
from ...ports.output.i_webhook_repository import IWebhookRepository


@dataclass
class RegisterWebhookCommand:
    space_id: str
    name: str
    url: str
    events: list[str]
    secret: str | None = None


class RegisterWebhookUseCase:
    def __init__(self, webhook_repo: IWebhookRepository) -> None:
        self._repo = webhook_repo

    async def execute(self, command: RegisterWebhookCommand) -> OutgoingWebhook:
        webhook = OutgoingWebhook(
            id=str(uuid.uuid4()),
            space_id=command.space_id,
            name=command.name,
            url=command.url,
            events=command.events,
            secret=command.secret,
        )
        return await self._repo.save(webhook)
