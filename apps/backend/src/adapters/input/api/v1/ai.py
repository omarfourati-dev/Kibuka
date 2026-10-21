from __future__ import annotations

import asyncio
import logging
import uuid
from collections.abc import AsyncGenerator
from functools import cache
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError

from .....adapters.output.ai.openai_adapter import OpenAIAdapter
from .....adapters.output.persistence.repositories.ai_usage_repository import (
    SessionScopedAIUsageRepository,
)
from .....core.domain.entities.ai_usage import AIUsage
from .....core.ports.output.i_ai_client import IAIClient
from .....core.ports.output.i_ai_usage_repository import IAIUsageRepository
from .....infrastructure.config import settings
from .....infrastructure.database import async_session_maker
from ..dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

#: Strong references to detached finalize tasks (client-disconnect path) —
#: without them the event loop may garbage-collect a running task.
_background_tasks: set[asyncio.Task[None]] = set()

#: Server-side allowlist — client-supplied model ids outside this set are
#: rejected so callers cannot escalate to arbitrary expensive models.
ALLOWED_CHAT_MODELS = frozenset({"gpt-4.1-mini", "gpt-4.1"})

#: Upper bound on message length to cap per-request token spend.
MAX_MESSAGE_LENGTH = 4000

#: USD per 1M tokens (input, output) — used to attribute cost per request.
MODEL_PRICES_USD_PER_1M: dict[str, tuple[float, float]] = {
    "gpt-4.1-mini": (0.40, 1.60),
    "gpt-4.1": (2.00, 8.00),
}

#: Hard cap on completion length — bounds the worst-case cost of one request.
MAX_COMPLETION_TOKENS = 1024

#: Concurrent streams per user — bounds how far parallel requests can
#: overshoot the daily limit (check-then-act window).
MAX_CONCURRENT_STREAMS_PER_USER = 2


class StreamLimiter:
    """Process-local counter of concurrent streams per user."""

    def __init__(self, max_concurrent: int) -> None:
        self._max = max_concurrent
        self._active: dict[str, int] = {}
        self._lock = asyncio.Lock()

    async def try_acquire(self, key: str) -> bool:
        async with self._lock:
            if self._active.get(key, 0) >= self._max:
                return False
            self._active[key] = self._active.get(key, 0) + 1
            return True

    async def release(self, key: str) -> None:
        async with self._lock:
            remaining = self._active.get(key, 0) - 1
            if remaining <= 0:
                self._active.pop(key, None)
            else:
                self._active[key] = remaining


stream_limiter = StreamLimiter(max_concurrent=MAX_CONCURRENT_STREAMS_PER_USER)


@cache
def get_ai_client() -> IAIClient:
    """Provide the chat AI client — OpenAI is the template's LLM provider.

    Cached so all requests share one adapter (and its HTTP connection pool);
    tests bypass the cache via FastAPI dependency_overrides.
    """
    return OpenAIAdapter(api_key=settings.openai_api_key)


@cache
def get_ai_usage_repository() -> IAIUsageRepository:
    """Provide the AI usage store for daily cost-limit enforcement.

    Session-per-operation SQL store: the chat stream records usage after the
    request-scoped session would already be closed. Tests override this.
    """
    return SessionScopedAIUsageRepository(async_session_maker)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    space_id: str
    conversation_id: str | None = None
    model: str = "gpt-4.1-mini"


class RagRequest(BaseModel):
    query: str
    space_id: str
    top_k: int = 5
    model: str = "gpt-4.1-mini"


class AgentRequest(BaseModel):
    task: str
    space_id: str
    tools: list[str] = ["web_search", "rag_search"]


def _estimate_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    input_price, output_price = MODEL_PRICES_USD_PER_1M[model]
    return (prompt_tokens * input_price + completion_tokens * output_price) / 1_000_000


@router.post("/chat")
async def chat(
    body: ChatRequest,
    user_id: Annotated[str, Depends(get_current_user)],
    ai_client: IAIClient = Depends(get_ai_client),  # noqa: B008
    usage_repo: IAIUsageRepository = Depends(get_ai_usage_repository),  # noqa: B008
) -> Any:
    """Streaming chat completion via OpenAI, emitted as server-sent events."""
    if not settings.enable_ai:
        raise HTTPException(status_code=404, detail="Feature not available")

    if body.model not in ALLOWED_CHAT_MODELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model not allowed. Allowed models: {sorted(ALLOWED_CHAT_MODELS)}",
        )

    daily_cost = await usage_repo.get_daily_cost_usd(user_id)
    if daily_cost >= settings.ai_cost_limit_usd_per_day:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily AI cost limit reached",
        )

    if not await stream_limiter.try_acquire(user_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many concurrent chat streams",
        )

    def _usage_row(prompt_tokens: int, completion_tokens: int) -> AIUsage:
        return AIUsage(
            id=str(uuid.uuid4()),
            space_id=body.space_id,
            user_id=user_id,
            model=body.model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            cost_usd=_estimate_cost_usd(body.model, prompt_tokens, completion_tokens),
            feature="chat",
        )

    try:
        prompt_tokens = await ai_client.count_tokens(body.message, body.model)
        # Fail-closed accounting: reserve the prompt cost BEFORE any paid
        # provider call. An invalid space_id fails here (FK) and the request
        # is rejected with zero provider spend.
        try:
            await usage_repo.save(_usage_row(prompt_tokens, 0))
        except IntegrityError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unknown space_id",
            ) from exc
        deltas = await ai_client.chat_completion(
            [{"role": "user", "content": body.message}],
            body.model,
            stream=True,
            max_tokens=MAX_COMPLETION_TOKENS,
        )
    except BaseException:
        await stream_limiter.release(user_id)
        raise

    async def sse_stream() -> AsyncGenerator[bytes, None]:
        completion_parts: list[str] = []

        async def _finalize() -> None:
            await stream_limiter.release(user_id)
            completion_text = "".join(completion_parts)
            if not completion_text:
                return
            try:
                completion_tokens = await ai_client.count_tokens(completion_text, body.model)
                await usage_repo.save(_usage_row(0, completion_tokens))
            except Exception:
                # The prompt reservation is already persisted; losing the
                # completion row must be visible, never silent.
                logger.exception("Failed to record chat completion usage for user %s", user_id)

        # Usage recording and slot release must run on every exit path —
        # normal completion, provider errors mid-stream, and client
        # disconnects — because the provider has already billed the tokens.
        try:
            async for delta in deltas:
                completion_parts.append(delta)
                yield f"data: {delta}\n\n".encode()
            yield b"data: [DONE]\n\n"
        except GeneratorExit:
            # Client disconnected: awaiting here would violate the async
            # generator protocol, so finalize in a detached task that we keep
            # a strong reference to (otherwise it may be garbage-collected).
            task = asyncio.get_running_loop().create_task(_finalize())
            _background_tasks.add(task)
            task.add_done_callback(_background_tasks.discard)
            raise
        except BaseException:
            await _finalize()
            raise
        else:
            await _finalize()

    return StreamingResponse(sse_stream(), media_type="text/event-stream")


@router.post("/rag")
async def rag_query(body: RagRequest) -> Any:
    """RAG query — retrieve from documents + stream answer."""
    from collections.abc import AsyncGenerator as AG

    async def stream_placeholder() -> AG[bytes, None]:
        yield b"data: RAG answer placeholder\n\n"
        yield b"data: [DONE]\n\n"

    return StreamingResponse(stream_placeholder(), media_type="text/event-stream")


@router.post("/documents", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(space_id: str, file: UploadFile = File(...)) -> Any:  # noqa: B008
    """Upload document for RAG ingestion. Returns document_id."""
    return {"document_id": "placeholder", "filename": file.filename, "status": "pending"}


@router.get("/documents")
async def list_documents(space_id: str) -> Any:
    """List all documents in a space."""
    return []


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: str) -> None:
    pass


@router.post("/agents/run")
async def run_agent(body: AgentRequest) -> Any:
    """Start an agent run. Returns run_id."""
    return {"run_id": "placeholder", "status": "running"}


@router.get("/agents/{run_id}")
async def get_agent_run(run_id: str) -> Any:
    """Get agent run status and steps."""
    return {"run_id": run_id, "status": "done", "steps": []}
