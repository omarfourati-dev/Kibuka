# AI Chat

**Feature flag:** `ENABLE_AI=true`

---

## Overview

The AI chat feature provides a streaming conversation interface backed by OpenAI or Anthropic, depending on configuration. Conversations are persisted per-user per-space, with full history management and per-request cost tracking.

---

## Streaming via Server-Sent Events

Responses are streamed token-by-token using the **Server-Sent Events (SSE)** protocol. This gives users immediate feedback rather than waiting for the full response.

```
Client                          Server
  │                               │
  │  POST /api/v1/chat/messages   │
  │──────────────────────────────►│
  │                               │
  │  event: token                 │
  │  data: {"delta": "Hello"}     │
  │◄──────────────────────────────│
  │                               │
  │  event: token                 │
  │  data: {"delta": " world"}    │
  │◄──────────────────────────────│
  │                               │
  │  event: done                  │
  │  data: {"usage": {...}}       │
  │◄──────────────────────────────│
```

The frontend uses the browser's `EventSource` API or the `@microsoft/fetch-event-source` library for POST-based SSE (required for sending the message body).

---

## Provider Adapters

The `LLMPort` interface is implemented by two adapters, switchable via configuration:

### OpenAI Adapter

```python
# Configured by: LLM_PROVIDER=openai, OPENAI_API_KEY=...
model = settings.OPENAI_CHAT_MODEL  # default: gpt-4o-mini
```

Uses `openai.AsyncOpenAI().chat.completions.create(stream=True)`.

### Anthropic Adapter

```python
# Configured by: LLM_PROVIDER=anthropic, ANTHROPIC_API_KEY=...
model = settings.ANTHROPIC_CHAT_MODEL  # default: claude-3-5-haiku-20241022
```

Uses `anthropic.AsyncAnthropic().messages.stream()`.

Switching providers requires only changing `LLM_PROVIDER` in the environment. No application code changes. Both adapters produce the same streaming event format.

---

## Conversation History

Each conversation is associated with a `space_id` and `user_id`. Messages are stored in the `messages` table with roles (`user`, `assistant`, `system`).

History management:

- **Context window:** The last N messages are included in each API call (configurable via `AI_CONTEXT_WINDOW_MESSAGES`, default: 20)
- **Summarization:** When conversation length exceeds the threshold, older messages are summarized into a single system message to stay within the model's context limit
- **Conversation reset:** Users can start a new conversation, which creates a new `conversation_id` without deleting the old one

---

## Cost Tracking

Every API call records an `AIUsage` entity:

```python
@dataclass
class AIUsage:
    id: UUID
    space_id: UUID
    user_id: UUID
    conversation_id: UUID
    provider: str          # "openai" | "anthropic"
    model: str             # "gpt-4o-mini"
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: Decimal      # calculated from provider pricing table
    created_at: datetime
```

Costs are calculated from a pricing table in `config/ai_pricing.py` that maps `(provider, model)` to cost per 1k tokens. This table must be updated when providers change their pricing.

A daily cost limit (`AI_COST_LIMIT_USD_PER_DAY`) is enforced per space. When the limit is reached, further AI requests return `429` with a descriptive error until the reset time (midnight UTC).

---

## API Reference

### Send a message

```
POST /api/v1/chat/conversations/{conversation_id}/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Explain quantum entanglement simply.",
  "role": "user"
}
```

Response: `text/event-stream`

### Create a conversation

```
POST /api/v1/chat/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Physics questions"
}
```

### List conversations

```
GET /api/v1/chat/conversations
Authorization: Bearer <token>
```

---

## Environment Variables

| Variable                     | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| `ENABLE_AI`                  | `true` to enable AI features                       |
| `LLM_PROVIDER`               | `openai` or `anthropic`                            |
| `OPENAI_API_KEY`             | Required if `LLM_PROVIDER=openai`                  |
| `ANTHROPIC_API_KEY`          | Required if `LLM_PROVIDER=anthropic`               |
| `OPENAI_CHAT_MODEL`          | Default: `gpt-4o-mini`                             |
| `ANTHROPIC_CHAT_MODEL`       | Default: `claude-3-5-haiku-20241022`               |
| `AI_CONTEXT_WINDOW_MESSAGES` | Messages to include in context. Default: `20`      |
| `AI_COST_LIMIT_USD_PER_DAY`  | Daily spend cap per space in USD. Default: `10.00` |
