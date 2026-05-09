from __future__ import annotations
from typing import AsyncGenerator
from openai import AsyncOpenAI
from ....core.ports.output.i_ai_client import IAIClient


class OpenAIAdapter(IAIClient):
    def __init__(self, api_key: str, default_model: str = "gpt-4o-mini") -> None:
        self._client = AsyncOpenAI(api_key=api_key)
        self._default_model = default_model

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str,
        stream: bool = False,
    ) -> AsyncGenerator[str, None]:
        async def _stream():
            response = await self._client.chat.completions.create(
                model=model or self._default_model,
                messages=messages,
                stream=True,
            )
            async for chunk in response:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta

        async def _no_stream():
            response = await self._client.chat.completions.create(
                model=model or self._default_model,
                messages=messages,
                stream=False,
            )
            yield response.choices[0].message.content or ""

        return _stream() if stream else _no_stream()

    async def embed(self, texts: list[str], model: str = "text-embedding-3-small") -> list[list[float]]:
        response = await self._client.embeddings.create(input=texts, model=model)
        return [item.embedding for item in response.data]

    async def count_tokens(self, text: str, model: str) -> int:
        import tiktoken
        try:
            enc = tiktoken.encoding_for_model(model)
        except KeyError:
            enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
