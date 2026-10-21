from __future__ import annotations

from collections.abc import AsyncGenerator
from functools import cache
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from .....adapters.output.ai.openai_adapter import OpenAIAdapter
from .....core.ports.output.i_ai_client import IAIClient
from .....infrastructure.config import settings

router = APIRouter(prefix="/ai", tags=["ai"])

_bearer = HTTPBearer(auto_error=False)

#: Server-side allowlist — client-supplied model ids outside this set are
#: rejected so callers cannot escalate to arbitrary expensive models.
ALLOWED_CHAT_MODELS = frozenset({"gpt-4.1-mini", "gpt-4.1"})

#: Upper bound on message length to cap per-request token spend.
MAX_MESSAGE_LENGTH = 4000


@cache
def get_ai_client() -> IAIClient:
    """Provide the chat AI client — OpenAI is the template's LLM provider.

    Cached so all requests share one adapter (and its HTTP connection pool);
    tests bypass the cache via FastAPI dependency_overrides.
    """
    return OpenAIAdapter(api_key=settings.openai_api_key)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
) -> str:
    """Return user_id or raise 401 — paid AI calls require authentication."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Placeholder — real implementation validates JWT
    return "authenticated-user"


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


@router.post("/chat")
async def chat(
    body: ChatRequest,
    _user_id: Annotated[str, Depends(get_current_user)],
    ai_client: IAIClient = Depends(get_ai_client),  # noqa: B008
) -> Any:
    """Streaming chat completion via OpenAI, emitted as server-sent events."""
    if not settings.enable_ai:
        raise HTTPException(status_code=404, detail="Feature not available")

    if body.model not in ALLOWED_CHAT_MODELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model not allowed. Allowed models: {sorted(ALLOWED_CHAT_MODELS)}",
        )

    deltas = await ai_client.chat_completion(
        [{"role": "user", "content": body.message}],
        body.model,
        stream=True,
    )

    async def sse_stream() -> AsyncGenerator[bytes, None]:
        async for delta in deltas:
            yield f"data: {delta}\n\n".encode()
        yield b"data: [DONE]\n\n"

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
