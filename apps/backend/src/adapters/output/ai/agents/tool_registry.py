"""Tool registry — add new tools here, add execution case in execute_tool()."""
from __future__ import annotations
from typing import Any
from .tools.web_search import web_search
from .tools.rag_tool import rag_search
from .tools.code_executor import execute_code

TOOL_DEFINITIONS: dict[str, dict] = {
    "web_search": {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for current information",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "Search query"}},
                "required": ["query"],
            },
        },
    },
    "rag_search": {
        "type": "function",
        "function": {
            "name": "rag_search",
            "description": "Search uploaded documents for relevant information",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "space_id": {"type": "string"},
                },
                "required": ["query", "space_id"],
            },
        },
    },
    "execute_code": {
        "type": "function",
        "function": {
            "name": "execute_code",
            "description": "Execute Python code and return the result",
            "parameters": {
                "type": "object",
                "properties": {"code": {"type": "string"}},
                "required": ["code"],
            },
        },
    },
}


def get_tools(names: list[str]) -> list[dict]:
    return [TOOL_DEFINITIONS[name] for name in names if name in TOOL_DEFINITIONS]


async def execute_tool(name: str, args: dict[str, Any]) -> str:
    match name:
        case "web_search":
            return await web_search(args["query"])
        case "rag_search":
            return await rag_search(args["query"], args["space_id"])
        case "execute_code":
            return await execute_code(args["code"])
        case _:
            return f"Unknown tool: {name}"
