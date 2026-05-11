from __future__ import annotations

from typing import Any

from arq.connections import RedisSettings

from .config import settings


async def send_welcome_email(ctx: dict[str, Any], user_id: str, email: str, name: str) -> None:
    pass


async def process_stripe_webhook(
    ctx: dict[str, Any], event_type: str, data: dict[str, Any]
) -> None:
    pass


async def deliver_webhook(
    ctx: dict[str, Any], webhook_id: str, event_type: str, payload: dict[str, Any]
) -> None:
    pass


async def ingest_document_background(
    ctx: dict[str, Any], document_id: str, space_id: str, content_b64: str, content_type: str
) -> None:
    pass


class WorkerSettings:
    functions = [
        send_welcome_email,
        process_stripe_webhook,
        deliver_webhook,
        ingest_document_background,
    ]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 10
    job_timeout = 300
    health_check_interval = 30
