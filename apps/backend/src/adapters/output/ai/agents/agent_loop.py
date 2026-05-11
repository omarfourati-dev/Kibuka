"""
ReAct Agent Loop: Think → Act (tool call) → Observe → repeat.
Uses OpenAI Function Calling. No LangChain/LlamaIndex.
"""

from __future__ import annotations

import json
from typing import Any, cast

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam, ChatCompletionToolParam

from .tool_registry import execute_tool, get_tools

_openai = AsyncOpenAI()
MAX_ITERATIONS = 10


async def run_agent(
    task: str,
    available_tools: list[str],
    context: dict[str, Any] | None = None,
) -> str:
    tools = get_tools(available_tools)
    messages: list[dict[str, Any]] = []

    if context:
        messages.append({"role": "system", "content": str(context)})
    messages.append({"role": "user", "content": task})

    for _ in range(MAX_ITERATIONS):
        response = await _openai.chat.completions.create(
            model="gpt-4o",
            messages=cast(list[ChatCompletionMessageParam], messages),
            tools=cast(list[ChatCompletionToolParam], tools),
            tool_choice="auto",
        )
        message = response.choices[0].message
        messages.append(message.model_dump())

        if not message.tool_calls:
            return message.content or ""

        for tool_call in message.tool_calls:
            if not hasattr(tool_call, "function"):
                continue
            result = await execute_tool(
                tool_call.function.name,
                json.loads(tool_call.function.arguments),
            )
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(result),
                }
            )

    return "Agent reached maximum iteration limit."
