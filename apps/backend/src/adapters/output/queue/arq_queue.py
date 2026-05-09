from __future__ import annotations
from typing import Any
from arq import create_pool
from arq.connections import RedisSettings
from ....core.ports.output.i_queue import IQueue


class ArqQueue(IQueue):
    def __init__(self, redis_settings: RedisSettings) -> None:
        self._redis_settings = redis_settings

    async def enqueue(
        self,
        job_name: str,
        *,
        kwargs: dict[str, Any] | None = None,
        delay_seconds: int = 0,
    ) -> str:
        pool = await create_pool(self._redis_settings)
        job = await pool.enqueue_job(
            job_name,
            **(kwargs or {}),
            _defer_by=delay_seconds if delay_seconds > 0 else None,
        )
        return job.job_id if job else ""
