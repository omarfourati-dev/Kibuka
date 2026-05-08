# ADR-003: Direct SDK Calls Instead of LangChain or LlamaIndex

**Status:** Accepted
**Date:** 2024-01-01
**Deciders:** Omar Fourati

---

## Context

The template needs AI capabilities: streaming chat, a RAG pipeline, and a ReAct agent loop. Two approaches were evaluated:

**Option A — AI framework (LangChain / LlamaIndex).** Use a high-level framework that provides pre-built chains, retrievers, agents, and integrations. Write less glue code, leverage a large ecosystem.

**Option B — Direct SDK calls.** Call the OpenAI and/or Anthropic Python SDKs directly. Implement the RAG pipeline and ReAct loop as ~150 lines of plain Python each.

LangChain and LlamaIndex are valuable for rapid prototyping but introduce costs that compound over time in a production codebase.

---

## Decision

Use **direct OpenAI/Anthropic SDK calls** throughout. Implement the RAG pipeline and ReAct agent loop as first-class application code.

Concretely:

- **Chat:** `openai.AsyncOpenAI().chat.completions.create(stream=True)` or `anthropic.AsyncAnthropic().messages.stream()`, wrapped in a thin adapter behind an `LLMPort` interface.
- **RAG pipeline:** Three explicit steps — `DocumentIngester` (chunk + embed), `Retriever` (pgvector cosine search), `RAGChain` (context assembly + completion call). Each step is a plain Python class with a clear interface.
- **ReAct agent:** A `while` loop with a counter cap. Each iteration: call the LLM with the tool list, parse the response, execute the chosen tool, append the observation to the message history, repeat until the model returns a final answer or the iteration limit is hit.

Provider switching (OpenAI ↔ Anthropic) is handled by swapping the concrete adapter behind `LLMPort`. The rest of the code is unaffected.

---

## Consequences

### Positive

- **Full control over behavior.** Every token, every prompt, every retrieval step is visible in the codebase. No hidden prompt templates or undocumented defaults from a framework.
- **No versioning nightmares.** LangChain's public API has changed significantly across major versions. A direct-call approach is stable as long as the underlying provider SDK is stable.
- **Easier debugging.** When something goes wrong, the call stack is application code all the way down. No framework internals to step through.
- **Smaller dependency surface.** LangChain pulls in dozens of transitive dependencies, many of which are not needed. The direct approach adds only `openai` and/or `anthropic` to the requirements.
- **Cost transparency.** Every API call explicitly records token counts and cost to the `AIUsage` entity. Framework abstractions often make it harder to intercept this data reliably.
- **Testability.** Mocking `openai.AsyncOpenAI` is straightforward. Mocking a LangChain chain with its internal state machine is substantially more complex.

### Negative

- **More code to own.** The RAG pipeline and ReAct loop are application code that must be maintained. Framework users get bug fixes for free.
- **No pre-built integrations.** Loading documents from S3, connecting to a dozen vector stores, or integrating with Zapier requires writing it from scratch rather than using a LangChain loader.
- **Re-implementing solved problems.** Chunking strategies, retrieval fusion, and prompt construction have been iterated on by the framework communities. The direct approach starts fresh.

### Mitigations

- The RAG pipeline and agent loop are designed to be simple enough (~150 lines each) that they are readable and maintainable by any Python developer.
- The `LLMPort` interface means a LangChain adapter could be added in the future if a specific use case makes it worthwhile — without changing use cases or domain code.
- The chunking and embedding logic is isolated in `DocumentIngester`, making it straightforward to improve the strategy without touching retrieval or generation.
