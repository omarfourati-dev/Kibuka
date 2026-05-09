from __future__ import annotations
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatRequest(BaseModel):
    message: str
    space_id: str
    conversation_id: Optional[str] = None
    model: str = "gpt-4o-mini"


class RagRequest(BaseModel):
    query: str
    space_id: str
    top_k: int = 5
    model: str = "gpt-4o-mini"


class AgentRequest(BaseModel):
    task: str
    space_id: str
    tools: list[str] = ["web_search", "rag_search"]


@router.post("/chat")
async def chat(body: ChatRequest):
    """Streaming chat completion."""
    async def stream_placeholder():
        yield "data: Hello from AI chat\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(stream_placeholder(), media_type="text/event-stream")


@router.post("/rag")
async def rag_query(body: RagRequest):
    """RAG query — retrieve from documents + stream answer."""
    async def stream_placeholder():
        yield "data: RAG answer placeholder\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(stream_placeholder(), media_type="text/event-stream")


@router.post("/documents", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(space_id: str, file: UploadFile = File(...)):
    """Upload document for RAG ingestion. Returns document_id."""
    return {"document_id": "placeholder", "filename": file.filename, "status": "pending"}


@router.get("/documents")
async def list_documents(space_id: str):
    """List all documents in a space."""
    return []


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: str):
    pass


@router.post("/agents/run")
async def run_agent(body: AgentRequest):
    """Start an agent run. Returns run_id."""
    return {"run_id": "placeholder", "status": "running"}


@router.get("/agents/{run_id}")
async def get_agent_run(run_id: str):
    """Get agent run status and steps."""
    return {"run_id": run_id, "status": "done", "steps": []}
