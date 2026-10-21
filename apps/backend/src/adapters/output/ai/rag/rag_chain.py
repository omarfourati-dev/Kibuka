"""RAG Step 3: Retrieved chunks + query → prompt → streaming LLM response."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import cast

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam
from sqlalchemy.ext.asyncio import AsyncSession

from .retriever import retrieve

_openai = AsyncOpenAI()

SYSTEM_PROMPT = """You are a helpful assistant.
Answer ONLY based on the provided context.
If the context lacks sufficient information, say so honestly."""


async def ask(
    query: str,
    space_id: str,
    db: AsyncSession,
    model: str = "gpt-4.1-mini",
    top_k: int = 5,
) -> AsyncGenerator[str, None]:
    chunks = await retrieve(query, space_id, db, top_k)
    context = "\n\n---\n\n".join(chunks)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"},
    ]
    response = await _openai.chat.completions.create(
        model=model, messages=cast(list[ChatCompletionMessageParam], messages), stream=True
    )
    async for chunk in response:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
