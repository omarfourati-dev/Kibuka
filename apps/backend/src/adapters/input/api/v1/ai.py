from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from functools import cache
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .....adapters.output.ai.openai_adapter import OpenAIAdapter
from .....adapters.output.persistence.repositories.ai_usage_repository import (
    InMemoryAIUsageRepository,
)
from .....core.domain.entities.ai_usage import AIUsage
from .....core.ports.output.i_ai_client import IAIClient
from .....core.ports.output.i_ai_usage_repository import IAIUsageRepository
from .....infrastructure.config import settings
from ..dependencies import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])

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

    Defaults to the process-local in-memory store so the limit works without
    DB wiring; production deployments override this with SqlAIUsageRepository.
    """
    return InMemoryAIUsageRepository()


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

    prompt_tokens = await ai_client.count_tokens(body.message, body.model)
    deltas = await ai_client.chat_completion(
        [{"role": "user", "content": body.message}],
        body.model,
        stream=True,
    )

    async def sse_stream() -> AsyncGenerator[bytes, None]:
        completion_text = ""
        async for delta in deltas:
            completion_text += delta
            yield f"data: {delta}\n\n".encode()
        yield b"data: [DONE]\n\n"

        completion_tokens = await ai_client.count_tokens(completion_text, body.model)
        await usage_repo.save(
            AIUsage(
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
        )

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
