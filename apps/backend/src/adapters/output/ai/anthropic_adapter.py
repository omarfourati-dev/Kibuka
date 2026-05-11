from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import cast

from anthropic import AsyncAnthropic
from anthropic._types import Omit
from anthropic.types import MessageParam

from ....core.ports.output.i_ai_client import IAIClient


class AnthropicAdapter(IAIClient):
    def __init__(self, api_key: str, default_model: str = "claude-haiku-4-5-20251001") -> None:
        self._client = AsyncAnthropic(api_key=api_key)
        self._default_model = default_model

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str,
        stream: bool = False,
    ) -> AsyncGenerator[str, None]:
        system_messages = [m["content"] for m in messages if m["role"] == "system"]
        user_messages = [m for m in messages if m["role"] != "system"]
        _omit = Omit()
        system: str | Omit = system_messages[0] if system_messages else _omit

        async def _stream() -> AsyncGenerator[str, None]:
            async with self._client.messages.stream(
                model=model or self._default_model,
                max_tokens=4096,
                system=system,
                messages=cast(list[MessageParam], user_messages),
            ) as stream_obj:
                async for text in stream_obj.text_stream:
                    yield text

        async def _no_stream() -> AsyncGenerator[str, None]:
            response = await self._client.messages.create(
                model=model or self._default_model,
                max_tokens=4096,
                system=system,
                messages=cast(list[MessageParam], user_messages),
            )
            for block in response.content:
                if hasattr(block, "text"):
                    yield block.text
                    break

        return _stream() if stream else _no_stream()

    async def embed(self, texts: list[str], model: str) -> list[list[float]]:
        raise NotImplementedError("Anthropic does not provide embedding API")

    async def count_tokens(self, text: str, model: str) -> int:
        response = await self._client.messages.count_tokens(
            model=model or self._default_model,
            messages=[{"role": "user", "content": text}],
        )
        return response.input_tokens
