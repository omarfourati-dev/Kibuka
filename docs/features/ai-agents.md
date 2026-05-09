# AI Agents

**Feature flag:** `ENABLE_AGENTS=true`

---

## Overview

The agent system implements a **ReAct** (Reason + Act) loop. The model iterates between thinking about what to do, calling a tool, and observing the result — until it arrives at a final answer or hits the iteration limit.

This is implemented directly using OpenAI Function Calling (no LangChain, no LlamaIndex). See ADR-003 for the rationale.

---

## ReAct Loop

```
┌──────────────────────────────────────────┐
│           ReAct Loop (max 10 iterations)  │
│                                           │
│  ┌──────────┐                            │
│  │  Think   │  LLM receives messages +   │
│  │          │  tool definitions           │
│  └────┬─────┘                            │
│       │                                   │
│       ├── Returns final_answer → DONE    │
│       │                                   │
│       ▼                                   │
│  ┌──────────┐                            │
│  │   Act    │  Parse tool_call from      │
│  │          │  LLM response               │
│  └────┬─────┘                            │
│       │                                   │
│       ▼                                   │
│  ┌──────────┐                            │
│  │ Observe  │  Execute tool, append      │
│  │          │  result to message history  │
│  └────┬─────┘                            │
│       │                                   │
│       └──── Next iteration ──────────────┘
└──────────────────────────────────────────┘
```

Each iteration calls the LLM once. Tool execution happens between iterations. The message history grows with each think/act/observe cycle, giving the model full context of what it has tried and learned.

---

## Available Tools

### `web_search`

Calls a search API to retrieve current information from the web.

```json
{
  "name": "web_search",
  "description": "Search the web for current information.",
  "parameters": {
    "query": "string"
  }
}
```

Configure via `SEARCH_PROVIDER` (`serper` or `tavily`) and the corresponding API key.

### `rag_search`

Searches the tenant's document store using the RAG retriever. Returns relevant document chunks.

```json
{
  "name": "rag_search",
  "description": "Search the user's documents for relevant information.",
  "parameters": {
    "query": "string",
    "document_ids": ["uuid"] // optional
  }
}
```

Requires `ENABLE_RAG=true`. The search is automatically scoped to the authenticated user's space.

### `execute_code`

Executes Python code in a sandboxed environment and returns the output.

```json
{
  "name": "execute_code",
  "description": "Execute Python code and return the result. Use for calculations, data processing, and analysis.",
  "parameters": {
    "code": "string",
    "language": "python"
  }
}
```

Execution is sandboxed via `RestrictedPython` or a subprocess with resource limits. Network access is disabled inside the sandbox. Timeout: 30 seconds.

---

## Iteration Limit and Error Handling

- **Maximum iterations:** 10 (configurable via `AGENT_MAX_ITERATIONS`)
- If the limit is reached without a final answer, the agent returns the best answer it has so far with a note that the task was incomplete.
- Tool execution errors are caught and returned as observations rather than crashing the loop. The model can decide to retry with different parameters or give up.
- If the model returns malformed JSON for a tool call, the error is fed back as an observation.

---

## Cost Tracking

Each iteration that calls the LLM records an `AIUsage` entry. A single agent run typically produces 3–7 LLM calls. The `agent_run_id` is set on all usage records for a single task execution, allowing total cost per run to be queried.

The daily cost limit (`AI_COST_LIMIT_USD_PER_DAY`) applies to agent runs in the same way as chat requests.

---

## Streaming Progress

Agent execution is streamed via SSE. The client receives events for each step:

```
event: thinking
data: {"iteration": 1}

event: tool_call
data: {"tool": "web_search", "args": {"query": "..."}}

event: tool_result
data: {"tool": "web_search", "result": "..."}

event: thinking
data: {"iteration": 2}

event: final_answer
data: {"content": "Based on my research, ..."}
```

This lets the frontend show a live "thinking..." indicator with each tool call visible as it happens.

---

## API Reference

### Run an agent task

```
POST /api/v1/agents/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "goal": "Find the latest revenue figures for Stripe and summarize them.",
  "tools": ["web_search", "rag_search"],
  "conversation_id": "uuid"   // optional, for context
}
```

Response: `text/event-stream`

### Get task history

```
GET /api/v1/agents/tasks/{task_id}
Authorization: Bearer <token>
```

---

## Environment Variables

| Variable                | Description                                 |
| ----------------------- | ------------------------------------------- |
| `ENABLE_AGENTS`         | `true` to enable agents                     |
| `AGENT_MAX_ITERATIONS`  | Max ReAct loop iterations. Default: `10`    |
| `AGENT_MODEL`           | LLM model for agents. Default: `gpt-4o`     |
| `SEARCH_PROVIDER`       | `serper` or `tavily`                        |
| `SERPER_API_KEY`        | Required if `SEARCH_PROVIDER=serper`        |
| `TAVILY_API_KEY`        | Required if `SEARCH_PROVIDER=tavily`        |
| `ENABLE_CODE_EXECUTION` | Allow `execute_code` tool. Default: `false` |
