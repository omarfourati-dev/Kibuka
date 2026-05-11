"""ARQ background worker — Kibuka children's book generator.

This module defines:
- ``startup`` / ``shutdown`` lifecycle hooks that wire all service dependencies.
- ``WorkerSettings`` consumed by the ARQ CLI (``python -m arq src.workers.arq_worker.WorkerSettings``).

The daily 06:00 UTC cron job calls ``generate_daily_book_job`` which is
implemented in the service layer and merely looked up from ``ctx``.
"""

from __future__ import annotations

import logging

from anthropic import AsyncAnthropic
from arq import cron
from arq.connections import RedisSettings
from openai import AsyncOpenAI

from ..adapters.output.ai.image_service import DallE3ImageService
from ..adapters.output.ai.tts_service import GoogleTTSService
from ..adapters.output.persistence.repositories.book_repository import SqlBookRepository
from ..adapters.output.storage.s3_storage_service import S3StorageService
from ..adapters.services.book_generation_service import (
    BookGenerationService,
    generate_daily_book_job,
)
from ..infrastructure.config import settings
from ..infrastructure.database import async_session_maker

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifecycle hooks
# ---------------------------------------------------------------------------


async def startup(ctx: dict) -> None:  # type: ignore[type-arg]
    """Initialise all service dependencies and store them in the ARQ context.

    ARQ passes *ctx* (a plain dict) to every job function, so we use it as a
    lightweight DI container.  All heavy clients (Anthropic, OpenAI, Google TTS,
    S3, database) are created once here and reused across jobs.
    """
    logger.info("ARQ worker starting up — wiring service dependencies")

    # External AI clients
    anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

    # Storage
    storage_service = S3StorageService(
        bucket=settings.s3_bucket,
        region=settings.s3_region,
        access_key_id=settings.s3_access_key_id,
        secret_access_key=settings.s3_secret_access_key,
        endpoint_url=settings.s3_endpoint_url,
    )

    # TTS (Google Cloud) — credentials_json may be empty; GoogleTTSService falls back to ADC
    tts_service = GoogleTTSService(
        storage_service=storage_service,
        credentials_json=settings.google_tts_credentials_json or None,
    )

    # Image generation (DALL-E 3)
    image_service = DallE3ImageService(
        openai_client=openai_client,
        storage=storage_service,
    )

    # Database session — kept open for the lifetime of the worker process.
    # ARQ jobs are sequential within max_jobs, so one session per worker is safe.
    db_session = async_session_maker()
    ctx["_db_session"] = db_session

    book_repository = SqlBookRepository(session=db_session)

    # Assemble the orchestrating service
    book_generation_service = BookGenerationService(
        anthropic_client=anthropic_client,
        book_repository=book_repository,
        tts_service=tts_service,
        image_service=image_service,
    )

    ctx["book_generation_service"] = book_generation_service
    logger.info("ARQ worker startup complete")


async def shutdown(ctx: dict) -> None:  # type: ignore[type-arg]
    """Clean up resources on worker shutdown."""
    logger.info("ARQ worker shutting down")
    db_session = ctx.get("_db_session")
    if db_session is not None:
        await db_session.close()
    logger.info("ARQ worker shutdown complete")


# ---------------------------------------------------------------------------
# WorkerSettings — consumed by the ARQ CLI
# ---------------------------------------------------------------------------


class WorkerSettings:
    """ARQ worker configuration.

    Run with::

        python -m arq src.workers.arq_worker.WorkerSettings
    """

    functions = [generate_daily_book_job]

    cron_jobs = [
        cron(generate_daily_book_job, hour=6, minute=0),
    ]

    redis_settings = RedisSettings(host=settings.redis_host, port=settings.redis_port)

    on_startup = startup
    on_shutdown = shutdown

    #: Maximum number of jobs running concurrently on this worker.
    max_jobs = 10

    #: Seconds before a job is considered timed out.
    #: Book generation involves multiple Claude + DALL-E + TTS calls — allow 10 min.
    job_timeout = 600

    #: Interval (seconds) between worker health-check log lines.
    health_check_interval = 30
