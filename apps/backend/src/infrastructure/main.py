from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from ..adapters.input.api.v1 import api_router
from ..adapters.input.middleware.correlation_id import CorrelationIdMiddleware
from ..adapters.input.middleware.request_logging import RequestLoggingMiddleware
from ..adapters.input.middleware.security_headers import SecurityHeadersMiddleware
from .config import settings
from .logging import configure_logging
from .telemetry import configure_telemetry


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    configure_logging()
    configure_telemetry()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        lifespan=lifespan,
    )

    # Drosselung gezielt pro Endpunkt (adapters/input/api/rate_limit.py) —
    # ein globales slowapi-Limit war registriert, aber nie wirksam

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    return app


app = create_app()
