from __future__ import annotations
from dataclasses import dataclass
from typing import AsyncGenerator
from ...domain.exceptions.ai import AIFeatureDisabledError
from ...ports.output.i_vector_store import IVectorStore
from ...ports.output.i_ai_client import IAIClient


@dataclass
class RagQueryCommand:
    space_id: str
    query: str
    top_k: int = 5
    model: str = "gpt-4o-mini"


RAG_SYSTEM_PROMPT = """You are a helpful assistant. Answer the question ONLY based on the provided context.
If the context does not contain sufficient information, say so honestly."""


class RagQueryUseCase:
    def __init__(
        self,
        vector_store: IVectorStore,
        ai_client: IAIClient,
        enable_rag: bool = True,
    ) -> None:
        self._vector_store = vector_store
        self._ai_client = ai_client
        self._enable_rag = enable_rag

    async def execute(self, command: RagQueryCommand) -> AsyncGenerator[str, None]:
        if not self._enable_rag:
            raise AIFeatureDisabledError("RAG features are disabled")

        query_embedding = await self._ai_client.embed([command.query], "text-embedding-3-small")
        chunks = await self._vector_store.search(
            query_embedding[0], command.space_id, command.top_k
        )
        context = "\n\n---\n\n".join(chunks)
        messages = [
            {"role": "system", "content": RAG_SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {command.query}"},
        ]
        return self._ai_client.chat_completion(messages, command.model, stream=True)
