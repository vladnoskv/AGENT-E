Awesome—here’s a clean, “hand-to-the-AI” implementation guide for a **NVIDIA NIM-CLI** that can select the best model per task, supports RAG, enforces \~40 msg/min, and plugs into the **NeMo Agent Toolkit** + (optionally) **MCP**.

I’ve broken it into:

1. architecture + files to create,
2. “how it works” pipeline,
3. concrete implementation tasks with **JSON job cards** (so you can run them in parallel with a code agent),
4. acceptance tests.

Citations are included where external behavior matters (NIM endpoints, NeMo docs, RAG playbooks). ([docs.api.nvidia.com][1], [NVIDIA Docs][2], [NVIDIA Developer][3])

---

# 1) Tech stack & high-level design

**Language:** TypeScript (Node 18+)
**CLI:** `commander` or `tsx` + native `process.argv`
**HTTP:** `fetch` (native) or `undici`
**Streaming:** event-source parser
**Rate limit:** token bucket (in-memory) + per-key sliding window
**RAG:** LangChain (optional) + NVIDIA **NeMo Retriever** NIMs for embeddings + rerank. ([NVIDIA Docs][4])
**Agent profiling/ops:** **NeMo Agent Toolkit** (metrics hooks around steps). ([NVIDIA Developer][3])
**Optional tools:** **MCP** client/server for tool discovery. ([NVIDIA Docs][5])

**API target:** NVIDIA NIM OpenAI-compatible endpoints:

* `POST /v1/chat/completions` (stream supported). ([docs.api.nvidia.com][1], [NVIDIA Docs][6])

---

# 2) File structure

```
nim-cli/
  package.json
  tsconfig.json
  src/
    index.ts                 # CLI entry (commander)
    config.ts                # env, defaults, model map
    registry/
      model-catalog.ts       # curated model list + capabilities
      selectors.ts           # choose model by task (coding, vision, etc.)
    clients/
      nim.ts                 # OpenAI-compatible client for NIM (chat/completions)
      stream.ts              # SSE/ndjson stream handler
    limits/
      rate-limit.ts          # token bucket + sliding window (40 msgs/min)
      retry.ts               # 429/backoff handling
    pipeline/
      prompt.ts              # system/user prompt assembly
      middleware.ts          # hooks: logging, metrics, caching
      runner.ts              # end-to-end request pipeline
    rag/
      embeddings.ts          # NeMo Retriever Embedding NIM calls
      vectorstore.ts         # local (SQLite/pg) or memory store + LangChain adapter
      retriever.ts           # query -> retrieve -> rerank (NeMo Rerank NIM)
      augment.ts             # build augmented prompt
    nemo/
      metrics.ts             # NeMo Agent Toolkit instrumentation
      mcp.ts                 # optional MCP client/server wiring
    commands/
      chat.ts                # `nim chat`
      rag.ts                 # `nim rag index` `nim rag query`
      models.ts              # `nim models list` (local catalog + remote /v1/models)
    utils/
      logger.ts
      schema.ts              # zod schemas for config & payloads
  test/
    e2e/
      chat.e2e.test.ts
      rag.e2e.test.ts
```

---

# 3) How the CLI works (data flow)

**CLI → Selector → Pipeline → (optional) RAG → NIM API → Stream to stdout**

1. **Selector** decides model from `task` (e.g., `coding`, `general`, `vision`, `rerank`) using your curated catalog.
2. **RAG (optional):** if `--with-rag` or task requires grounding:

   * Embed query + corpus via **NeMo Retriever Embedding NIM**, store/retrieve via vector store, **rerank** with **NeMo Reranking NIM**, then inject top-K chunks into the prompt. ([NVIDIA Docs][4])
3. **Rate limit**: enforce 40 msg/min per API key (burst 10). Handle 429 with exponential backoff. (NIM can return 429 under load.) ([NVIDIA Developer Forums][7])
4. **Call NIM**: `POST https://integrate.api.nvidia.com/v1/chat/completions` with streaming = true. (OpenAI-compatible.) ([docs.api.nvidia.com][1], [NVIDIA Docs][2])
5. **Stream output**: parse deltas, show tokens live.
6. **Metrics**: wrap steps with NeMo Agent Toolkit timers/counters. ([NVIDIA Developer][3])
7. **MCP (optional)**: discover tools/data connectors for agent workflows. ([NVIDIA Docs][5])

---

# 4) Model catalog (curated)

Create a **local registry** mapping **task → recommended models**. (You can later hydrate from `/v1/models`.) ([NVIDIA Docs][2])

Examples (adjust to your tenant availability):

* **General chat/analysis**: `meta/llama-3.1-70b-instruct` or `microsoft/phi-4` (if present in your NIM org).
* **Coding**: `codellama/70b-instruct` or an OSS coding-tuned model offered in your NIM catalog.
* **Vision chat**: model with image input support in NIM catalog.
* **Embeddings**: **NeMo Retriever Text Embedding NIM** model id per docs. ([NVIDIA Docs][8])
* **Reranker**: **NeMo Retriever Text Reranking NIM** model id per docs. ([NVIDIA Docs][9])

(Keep names flexible—NIM publishes a `/v1/models` list.) ([NVIDIA Docs][2])

---

# 5) Concrete “Job Cards” for your AI (JSON)

Each card = a self-contained task with inputs/outputs & acceptance criteria.
You can run **A, B, C** in parallel; then do **D → E → F**.

## A) Initialize project & scaffolding

```json
{
  "task": "init_repo",
  "objective": "Scaffold a TypeScript CLI project called nim-cli with the structure above.",
  "steps": [
    "Create package.json (type: module). Add deps: commander, zod, undici, dotenv, langchain, @langchain/community, better-sqlite3 or pg, chalk.",
    "Add devDeps: typescript, tsx, vitest, eslint, prettier.",
    "Create tsconfig.json (moduleResolution: bundler, target ES2022).",
    "Create folders and empty files per structure.",
    "Add npm scripts: build, dev, test, lint, format, nim (bin=dist/index.js).",
    "Set CLI bin in package.json to dist/index.js."
  ],
  "acceptance_tests": [
    "Running `npm run build` succeeds.",
    "`node dist/index.js --help` shows top-level help."
  ]
}
```

## B) Config & schema

```json
{
  "task": "config_env",
  "objective": "Implement config loader with env and defaults; validate via zod.",
  "steps": [
    "In src/config.ts: load NIM_BASE_URL (default https://integrate.api.nvidia.com/v1), NIM_API_KEY (required), RATE_LIMIT_PER_MIN=40, BURST=10.",
    "Export typed Config object.",
    "Fail with helpful message if NIM_API_KEY missing."
  ],
  "acceptance_tests": [
    "CLI exits with clear error if key missing.",
    "When env set, `nim chat -m auto -p 'hello'` proceeds to network call."
  ]
}
```

## C) Model catalog + selector

```json
{
  "task": "catalog_selector",
  "objective": "Provide a curated model catalog and a selector that chooses model by task or explicit `-m`.",
  "steps": [
    "In registry/model-catalog.ts define capabilities {general,coding,vision,embeddings,rerank} mapping to model ids.",
    "In registry/selectors.ts implement `selectModel({task, explicitModel, capability})` with fallback order and remote `/v1/models` hydration.",
    "Log chosen model and capability."
  ],
  "acceptance_tests": [
    "If `-m` set, selector returns it.",
    "If `--task coding`, returns coding model from catalog."
  ]
}
```

## D) NIM client + streaming (depends on A,B,C)

```json
{
  "task": "nim_client",
  "objective": "Implement OpenAI-compatible client for NIM Chat Completions with streaming and robust errors.",
  "steps": [
    "In clients/nim.ts implement `chatCompletion({model,messages,temperature,max_tokens,stream})` using fetch to POST /v1/chat/completions with Bearer key.",
    "Default `stream: true` and parse SSE chunks in clients/stream.ts.",
    "Handle 400/401/429/5xx; surface helpful errors; ensure `max_tokens` is set (some models require it)."
  ],
  "acceptance_tests": [
    "`nim chat -p 'hello'` prints streamed tokens.",
    "Simulate 401/429 and verify user-facing error messages."
  ],
  "notes": [
    "NIM Chat Completions endpoint + OpenAI-compat behavior documented here.",
    "Some releases required `max_tokens` explicitly—set a sensible default like 1024."
  ]
}
```

(Refs: endpoints & OpenAI-compatible behavior. ([docs.api.nvidia.com][1], [NVIDIA Docs][2], [NVIDIA Developer Forums][10]))

## E) Rate limiting + retries (depends on B,D)

```json
{
  "task": "limits_retries",
  "objective": "Enforce ~40 req/min/key with burst 10 and handle 429 gracefully.",
  "steps": [
    "In limits/rate-limit.ts implement token bucket replenishing 40/min, burst=10, keyed by API key.",
    "In limits/retry.ts implement exponential backoff on 429 with jitter (e.g., 0.5s, 1s, 2s, 4s; cap 30s) and stop after 5 tries.",
    "Wrap client calls in a limiter+retry middleware."
  ],
  "acceptance_tests": [
    "Hammer 60 calls; first ~10 burst immediately, others delay; total < 60s violation.",
    "Receive 429 from mock; verify backoff and eventual success or useful failure."
  ],
  "notes": [
    "NIM cloud can return 429 under load; design for resilience."
  ]
}
```

(Ref: 429 reports. ([NVIDIA Developer Forums][7]))

## F) RAG: embeddings + store + rerank + augmentation (depends on A,B,C,D)

```json
{
  "task": "rag_pipeline",
  "objective": "Add optional RAG with NeMo Retriever Embedding NIM and Reranker NIM, then inject context into prompts.",
  "steps": [
    "In rag/embeddings.ts implement `embedTexts()` that calls NeMo Retriever Text Embedding NIM via LangChain `NVIDIAEmbeddings`.",
    "In rag/vectorstore.ts implement a simple vector store (SQLite+FAISS or pg+pgvector).",
    "In rag/retriever.ts: given a query, embed, search topK, call NVIDIARerank to reorder, return topN passages.",
    "In rag/augment.ts: build final prompt template with citations.",
    "Add CLI: `nim rag index <path>` to chunk+embed docs; `nim rag query -q '...' --with-rag` to run retrieval then chat."
  ],
  "acceptance_tests": [
    "Index a small folder; embeddings stored.",
    "`nim rag query` returns grounded answer and prints citation list."
  ],
  "notes": [
    "Use NVIDIA playbooks for LangChain wiring examples for Embedding/Rerank.",
    "Keep chunking 300-500 tokens with overlap 50-100; store metadata (source, page)."
  ]
}
```

(Refs: NeMo Retriever Embedding + Rerank playbooks/overviews. ([NVIDIA Docs][4]))

## G) NeMo Agent Toolkit metrics (depends on D,E,F)

```json
{
  "task": "nemo_metrics",
  "objective": "Wrap pipeline steps with NeMo Agent Toolkit instrumentation for profiling & optimization.",
  "steps": [
    "In nemo/metrics.ts expose `withSpan(name, fn)` and counters for tokens, latency, tool calls.",
    "Wrap: selection, RAG retrieval, NIM request, stream decode.",
    "Export a `--metrics json` flag to print a summary after each run."
  ],
  "acceptance_tests": [
    "Metrics show total latency, prompt+completion tokens, retrieval ms, rerank ms."
  ],
  "notes": [
    "Toolkit focuses on profiling/evaluation for production agent systems."
  ]
}
```

(Ref: NeMo Agent Toolkit. ([NVIDIA Developer][3]))

## H) MCP (optional)

```json
{
  "task": "mcp_tools",
  "objective": "Add optional MCP client to discover tools (data connectors) and expose a local MCP server for your own tools.",
  "steps": [
    "In nemo/mcp.ts implement a minimal MCP client and register a 'vector-search' tool.",
    "Add `--mcp` flag to enable/disable MCP.",
    "Demonstrate calling a remote MCP tool and logging the tool result in the chat turn."
  ],
  "acceptance_tests": [
    "When `--mcp` enabled, a tool call result is appended to system context.",
    "Disabling MCP skips tool discovery."
  ],
  "notes": [
    "Follow AIQ/NeMo MCP docs for client/server shape."
  ]
}
```

(Ref: MCP in AIQ/NeMo docs, background of MCP. ([NVIDIA Docs][5], [The Verge][11]))

## I) CLI commands & UX polish

```json
{
  "task": "cli_commands",
  "objective": "Finish CLI UX with subcommands and helpful flags.",
  "steps": [
    "Commands: `nim chat`, `nim models list`, `nim rag index`, `nim rag query`.",
    "Flags: `-m, --model`, `-t, --task`, `--with-rag`, `--topk`, `--temperature`, `--max-tokens`, `--metrics`.",
    "Pretty streaming output with tool/citation badges."
  ],
  "acceptance_tests": [
    "`nim models list` shows local catalog + remote models when key present.",
    "Help text is clear and examples are provided."
  ]
}
```

## J) Tests (unit + e2e)

```json
{
  "task": "tests",
  "objective": "Add Vitest unit tests and two end-to-end scripts.",
  "steps": [
    "Mock fetch to verify request payloads include model, messages, max_tokens, stream.",
    "E2E: chat without RAG; chat with RAG on a tiny corpus.",
    "Add a 429 simulation test that ensures backoff."
  ],
  "acceptance_tests": [
    "`npm test` passes locally.",
    "CI runs on PR and blocks merge on failure."
  ]
}
```

---

# 6) Key snippets (what the AI should implement)

### NIM chat call (OpenAI-compatible)

* Endpoint: `POST https://integrate.api.nvidia.com/v1/chat/completions`
* Auth: `Authorization: Bearer ${NIM_API_KEY}`
* Required fields: `model`, `messages[]`; set `stream: true`; **set `max_tokens`** to a safe default for compatibility. ([docs.api.nvidia.com][1], [NVIDIA Docs][6], [NVIDIA Developer Forums][10])

### RAG wiring

* Use NVIDIA **NVIDIAEmbeddings** + **NVIDIARerank** from LangChain playbooks; store vectors + rerank before augmentation. ([NVIDIA Docs][4])

### Rate limit policies

* **Token bucket**: refill 40/min, capacity 10 burst; per-key map; middleware before network call; on 429 → exponential backoff with jitter. (Cloud NIM can throttle.) ([NVIDIA Developer Forums][7])

### Metrics

* Time: selection, embedding, search, rerank, NIM latency, stream decode; count tokens; export JSON.

---

# 7) Security & ops checklists

* Never log API keys. Mask model responses in debug logs if sensitive.
* Add `NIM_BASE_URL` override for self-hosted NIMs. ([NVIDIA Docs][2])
* Expose `--dry-run` to print payloads without sending.
* Handle intermittent NIM catalog latency or trial queueing gracefully (warn + retry). ([NVIDIA Developer Forums][12])
* Add `GET /v1/models` cache (60s) to avoid hammering the catalog. ([NVIDIA Docs][2])

---

# 8) Acceptance criteria (done = ✅)

* `nim chat` streams reliably; `--task coding` picks coding model; `-m` overrides.
* Under load tests, limiter keeps ≤40 requests/min; 429 backoff works. ([NVIDIA Developer Forums][7])
* `nim rag index` and `nim rag query` produce grounded answers with citations using NeMo Retriever (embed+rerank). ([NVIDIA Docs][4])
* Metrics report prints JSON with latencies and token counts via NeMo Agent Toolkit wrappers. ([NVIDIA Developer][3])
* (Optional) MCP flag demonstrates a tool call included in the conversation context. ([NVIDIA Docs][5])

---

If you want, I can also generate the initial repository (package.json, tsconfig, empty files, and a first working `nim chat` command) in one go.

[1]: https://docs.api.nvidia.com/nim/reference/create_chat_completion_v1_chat_completions_post?utm_source=chatgpt.com "Create a chat completion"
[2]: https://docs.nvidia.com/nim/large-language-models/latest/api-reference.html?utm_source=chatgpt.com "API Reference for NVIDIA NIM for LLMs"
[3]: https://developer.nvidia.com/nemo-agent-toolkit?utm_source=chatgpt.com "NVIDIA NeMo Agent Toolkit"
[4]: https://docs.nvidia.com/nim/nemo-retriever/text-embedding/1.3.0/playbook.html?utm_source=chatgpt.com "LangChain Playbook — NeMo Retriever Text Embedding ..."
[5]: https://docs.nvidia.com/aiqtoolkit/latest/workflows/mcp/index.html?utm_source=chatgpt.com "Model Context Protocol (MCP)"
[6]: https://docs.nvidia.com/nim/large-language-models/latest/getting-started.html?utm_source=chatgpt.com "Get Started with NVIDIA NIM for LLMs"
[7]: https://forums.developer.nvidia.com/t/getting-429-too-many-request-for-nim-cloud-api/335755?utm_source=chatgpt.com "Getting 429 Too many request for NIM cloud api - Models"
[8]: https://docs.nvidia.com/nim/nemo-retriever/text-embedding/latest/overview.html?utm_source=chatgpt.com "Overview of NeMo Retriever Text Embedding NIM"
[9]: https://docs.nvidia.com/nim/nemo-retriever/text-reranking/latest/overview.html?utm_source=chatgpt.com "Overview of NeMo Retriever Text Reranking NIM"
[10]: https://forums.developer.nvidia.com/t/openai-compatible-api-does-not-work/303942?utm_source=chatgpt.com "OpenAI Compatible API does not work - Models"
[11]: https://www.theverge.com/2024/11/25/24305774/anthropic-model-context-protocol-data-sources?utm_source=chatgpt.com "Anthropic launches tool to connect AI systems directly to datasets"
[12]: https://forums.developer.nvidia.com/t/not-connect-to-endpoint-https-integrate-api-nvidia-com-v1/324036?utm_source=chatgpt.com "Not connect to endpoint https://integrate.api.nvidia.com/v1 - ..."
