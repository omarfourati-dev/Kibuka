from __future__ import annotations
from arq.connections import RedisSettings
from .config import settings


async def send_welcome_email(ctx, user_id: str, email: str, name: str) -> None:
    pass


async def process_stripe_webhook(ctx, event_type: str, data: dict) -> None:
    pass


async def deliver_webhook(ctx, webhook_id: str, event_type: str, payload: dict) -> None:
    pass


async def ingest_document_background(
    ctx, document_id: str, space_id: str, content_b64: str, content_type: str
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
