"""RAG Step 3: Retrieved chunks + query → prompt → streaming LLM response."""
from __future__ import annotations
from typing import AsyncGenerator
from openai import AsyncOpenAI
from .retriever import retrieve
from sqlalchemy.ext.asyncio import AsyncSession

_openai = AsyncOpenAI()

SYSTEM_PROMPT = """You are a helpful assistant.
Answer ONLY based on the provided context.
If the context lacks sufficient information, say so honestly."""


async def ask(
    query: str,
    space_id: str,
    db: AsyncSession,
    model: str = "gpt-4o-mini",
    top_k: int = 5,
) -> AsyncGenerator[str, None]:
    chunks = await retrieve(query, space_id, db, top_k)
    context = "\n\n---\n\n".join(chunks)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"},
    ]
    response = await _openai.chat.completions.create(
        model=model, messages=messages, stream=True
    )
    async for chunk in response:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
