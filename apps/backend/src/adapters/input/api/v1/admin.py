from __future__ import annotations
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def get_stats():
    """Admin dashboard statistics."""
    return {"total_users": 0, "total_spaces": 0, "ai_usage_today_usd": 0.0}


@router.get("/users")
async def list_users(page: int = 1, page_size: int = 20):
    return {"items": [], "total": 0}


@router.post("/mobile/build")
async def trigger_mobile_build(profile: str = "preview"):
    """Trigger EAS mobile build via GitHub Actions API."""
    return {"status": "triggered", "profile": profile}


@router.get("/mobile/builds")
async def list_mobile_builds():
    return []


@router.post("/ai-code/run")
async def run_ai_code(instruction: str):
    """Stream Claude Code CLI output as SSE."""
    import asyncio
    async def generate():
        instruction_safe = instruction.replace('"', '\\"')[:2000]
        proc = await asyncio.create_subprocess_exec(
            "claude", "--print", f"@backend-dev @frontend-dev {instruction_safe}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        async for line in proc.stdout:
            decoded = line.decode("utf-8", errors="ignore").rstrip()
            yield f"data: {decoded}\n\n"
        await proc.wait()
        yield "data: [DONE]\n\n"

    from fastapi.responses import StreamingResponse
    return StreamingResponse(generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/feature-flags")
async def get_feature_flags():
    return {"ENABLE_AI": True, "ENABLE_RAG": True, "ENABLE_AGENTS": True,
            "ENABLE_BILLING": False, "ENABLE_MULTI_TENANT": True,
            "ENABLE_WEBSOCKETS": True, "ENABLE_AI_CODE_EDITOR": True}


@router.patch("/feature-flags")
async def update_feature_flags(flags: dict):
    return flags
