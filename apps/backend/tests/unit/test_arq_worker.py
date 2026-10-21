"""Unit tests for ARQ worker configuration — TDD RED phase.

Tests MUST fail until src/workers/arq_worker.py is implemented.
"""

from __future__ import annotations

import sys
import types
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Bootstrap: stub out 'arq' before any project import touches it,
# since arq is not installed in the test environment.
# ---------------------------------------------------------------------------

_arq_stub = types.ModuleType("arq")
_arq_connections_stub = types.ModuleType("arq.connections")


class _FakeCronJob:
    """Minimal stand-in for arq.cron return value."""

    def __init__(self, coroutine, *, hour: int, minute: int, **kwargs) -> None:  # type: ignore[type-arg]
        self.coroutine = coroutine
        self.hour = hour
        self.minute = minute


def _fake_cron(coroutine, *, hour: int = 0, minute: int = 0, **kwargs) -> _FakeCronJob:  # type: ignore[type-arg]
    return _FakeCronJob(coroutine, hour=hour, minute=minute)


class _FakeRedisSettings:
    def __init__(self, *, host: str = "localhost", port: int = 6379, **kwargs) -> None:
        self.host = host
        self.port = port

    @classmethod
    def from_dsn(cls, dsn: str) -> _FakeRedisSettings:
        return cls()


_arq_stub.cron = _fake_cron  # type: ignore[attr-defined]
_arq_connections_stub.RedisSettings = _FakeRedisSettings  # type: ignore[attr-defined]
_arq_stub.connections = _arq_connections_stub  # type: ignore[attr-defined]

sys.modules.setdefault("arq", _arq_stub)
sys.modules.setdefault("arq.connections", _arq_connections_stub)

# ---------------------------------------------------------------------------
# Also stub heavy external deps that may not be installed
# ---------------------------------------------------------------------------

for _mod in [
    "google",
    "google.cloud",
    "google.cloud.texttospeech",
    "google.oauth2",
    "google.oauth2.service_account",
]:
    sys.modules.setdefault(_mod, types.ModuleType(_mod))

# ---------------------------------------------------------------------------
# Stub Settings so that missing env vars (e.g. SECRET_KEY) don't blow up
# at import time — the worker only uses settings at startup(), which we mock.
# ---------------------------------------------------------------------------

_fake_settings = MagicMock()
_fake_settings.openai_api_key = ""
_fake_settings.google_tts_credentials_json = ""
_fake_settings.redis_host = "localhost"
_fake_settings.redis_port = 6379
_fake_settings.s3_bucket = "kibuka-books"
_fake_settings.s3_region = "eu-central-1"
_fake_settings.s3_access_key_id = ""
_fake_settings.s3_secret_access_key = ""
_fake_settings.s3_endpoint_url = ""

_real_config_module = sys.modules.get("src.infrastructure.config")
_config_stub = types.ModuleType("src.infrastructure.config")
_config_stub.settings = _fake_settings  # type: ignore[attr-defined]
sys.modules["src.infrastructure.config"] = _config_stub

# Also patch the database module to avoid real DB connection at import time
_real_db_module = sys.modules.get("src.infrastructure.database")
_db_stub = types.ModuleType("src.infrastructure.database")
_db_stub.async_session_maker = MagicMock()  # type: ignore[attr-defined]
sys.modules["src.infrastructure.database"] = _db_stub

# ---------------------------------------------------------------------------
# Now we can safely import the module under test
# ---------------------------------------------------------------------------

from src.adapters.services.book_generation_service import (  # noqa: E402
    BookGenerationService,
    generate_daily_book_job,
)
from src.workers.arq_worker import WorkerSettings, shutdown, startup  # noqa: E402

# ---------------------------------------------------------------------------
# Restore the real infrastructure modules: the stubs above must only affect
# the arq_worker import, never test modules collected after this one.
# ---------------------------------------------------------------------------

if _real_config_module is not None:
    sys.modules["src.infrastructure.config"] = _real_config_module
else:
    del sys.modules["src.infrastructure.config"]
if _real_db_module is not None:
    sys.modules["src.infrastructure.database"] = _real_db_module
else:
    del sys.modules["src.infrastructure.database"]

# ---------------------------------------------------------------------------
# WorkerSettings structural tests
# ---------------------------------------------------------------------------


class TestWorkerSettingsStructure:
    """Verify that WorkerSettings is correctly configured."""

    def test_worker_settings_includes_generate_daily_book_job(self) -> None:
        """generate_daily_book_job must be registered so ARQ knows about it."""
        assert generate_daily_book_job in WorkerSettings.functions

    def test_worker_settings_has_cron_job_at_6am(self) -> None:
        """Cron must fire at 06:00 UTC every day."""
        assert len(WorkerSettings.cron_jobs) >= 1
        cron_job = WorkerSettings.cron_jobs[0]
        assert cron_job.hour == 6
        assert cron_job.minute == 0

    def test_worker_settings_cron_job_uses_generate_daily_book_job(self) -> None:
        """The 06:00 cron job must invoke generate_daily_book_job."""
        cron_job = WorkerSettings.cron_jobs[0]
        assert cron_job.coroutine is generate_daily_book_job

    def test_worker_settings_job_timeout_is_at_least_300_seconds(self) -> None:
        """Book generation is slow (Claude + DALL-E + TTS) — needs generous timeout."""
        assert WorkerSettings.job_timeout >= 300

    def test_worker_settings_max_jobs_is_set(self) -> None:
        """max_jobs must be configured to avoid unbounded concurrency."""
        assert WorkerSettings.max_jobs >= 1


# ---------------------------------------------------------------------------
# startup / shutdown lifecycle tests
# ---------------------------------------------------------------------------


class TestStartupShutdown:
    """Test worker lifecycle hooks."""

    @pytest.mark.asyncio
    async def test_startup_stores_book_generation_service_in_context(self) -> None:
        """startup() must wire all services and put BookGenerationService in ctx."""
        ctx: dict = {}

        mock_session = AsyncMock()
        mock_session_cm = AsyncMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=False)

        mock_session_maker = MagicMock(return_value=mock_session_cm)

        with (
            patch(
                "src.workers.arq_worker.AsyncOpenAI",
                return_value=MagicMock(),
            ),
            patch(
                "src.workers.arq_worker.GoogleTTSService",
                return_value=MagicMock(),
            ),
            patch(
                "src.workers.arq_worker.DallE3ImageService",
                return_value=MagicMock(),
            ),
            patch(
                "src.workers.arq_worker.S3StorageService",
                return_value=MagicMock(),
            ),
            patch(
                "src.workers.arq_worker.SqlBookRepository",
                return_value=MagicMock(),
            ),
            patch(
                "src.workers.arq_worker.async_session_maker",
                mock_session_maker,
            ),
        ):
            await startup(ctx)

        assert "book_generation_service" in ctx
        assert isinstance(ctx["book_generation_service"], BookGenerationService)

    @pytest.mark.asyncio
    async def test_shutdown_completes_without_error(self) -> None:
        """shutdown() must not raise even when ctx is empty."""
        ctx: dict = {}
        # Should not raise
        await shutdown(ctx)

    @pytest.mark.asyncio
    async def test_startup_uses_settings_for_openai_key(self) -> None:
        """OpenAI client must be initialised with the API key from settings."""
        ctx: dict = {}
        mock_openai_cls = MagicMock(return_value=MagicMock())

        mock_session = AsyncMock()
        mock_session_cm = AsyncMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=False)
        mock_session_maker = MagicMock(return_value=mock_session_cm)

        with (
            patch("src.workers.arq_worker.AsyncOpenAI", mock_openai_cls),
            patch("src.workers.arq_worker.GoogleTTSService", return_value=MagicMock()),
            patch("src.workers.arq_worker.DallE3ImageService", return_value=MagicMock()),
            patch("src.workers.arq_worker.S3StorageService", return_value=MagicMock()),
            patch("src.workers.arq_worker.SqlBookRepository", return_value=MagicMock()),
            patch("src.workers.arq_worker.async_session_maker", mock_session_maker),
        ):
            await startup(ctx)

        mock_openai_cls.assert_called_once()
        call_kwargs = mock_openai_cls.call_args
        assert call_kwargs is not None
