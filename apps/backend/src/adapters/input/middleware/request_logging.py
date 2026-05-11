from __future__ import annotations

import time
from collections.abc import Awaitable, Callable

from fastapi import Request
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        start = time.perf_counter()
        correlation_id = getattr(request.state, "correlation_id", "-")

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "{method} {path} {status} {duration:.1f}ms [{correlation_id}]",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration=duration_ms,
            correlation_id=correlation_id,
        )
        return response
