# prefixguard Architecture Specification

## Overview
`prefixguard` is a transparent reverse proxy designed to maximize prompt cache hits on frontier large language model APIs (Anthropic, DeepSeek, OpenAI). It intercepts raw HTTP/1.1 and HTTP/2 requests on the wire, analyzes prompt topologies, extracts volatile dynamic variables, canonicalizes tool schemas, and aligns token counts to provider cache quantization boundaries.

```
       +-------------------------------------------------------------+
       |               Client Application / Agent Harness            |
       |       (Configured with baseUrl: http://localhost:8585)      |
       +-------------------------------------------------------------+
                                      |
                     Inbound Request with Unstable Prefix
                                      v
       +-------------------------------------------------------------+
       |                    prefixguard Reverse Proxy                |
       |                    (High-Performance Go Engine)             |
       |                                                             |
       |  +---------------------+        +------------------------+  |
       |  | Wire-Speed Request  |------->| Volatile Variable      |  |
       |  | Interceptor & Lexer |        | Extractor (Timestamps) |  |
       |  +---------------------+        +------------------------+  |
       |                                              |              |
       |                                              v              |
       |  +-------------------------------------------------------+  |
       |  |          Deterministic Tool Schema Canonicalizer      |  |
       |  |  - Alphabetical Stable Key Sorting                    |  |
       |  |  - Zero-Whitespace JSON Schema Minification           |  |
       |  +-------------------------------------------------------+  |
       |                               |                             |
       |                               v                             |
       |  +-------------------------------------------------------+  |
       |  |         Prefix Compiler & Topology Reorganizer        |  |
       |  |  [Static Invariant Prefix] -> [Deterministic Tools]   |  |
       |  |  [Few-Shot Anchor]         -> [Volatile User Suffix]  |  |
       |  +-------------------------------------------------------+  |
       |                               |                             |
       |                               v                             |
       |  +-------------------------------------------------------+  |
       |  |         Boundary Padder (1024 / 2048 Threshold)       |  |
       |  |  Prefix = 950 Tokens -> Pads to 1024 Target Boundary  |  |
       |  |  Auto-injects Anthropic cache_control breakpoint      |  |
       |  +-------------------------------------------------------+  |
       |                               |                             |
       +-------------------------------|-----------------------------+
                                       |
                         Optimized Cache-Aligned Request
                                       v
       +-------------------------------------------------------------+
       |             Upstream LLM Provider (Anthropic/DeepSeek/OAI)  |
       |             Returns: cache_read_input_tokens > 0            |
       +-------------------------------------------------------------+
                                       |
                                       v
       +-------------------------------------------------------------+
       |                  FinOps & Observability                     |
       |  1. Transparent Streaming Response Delivered to Client      |
       |  2. Async Telemetry Logged to SQLite (USD Saved / Hit Rate) |
       |  3. Embedded React 19 Cache Studio (Local HTTP :8585)       |
       +-------------------------------------------------------------+
```

## Pipeline Components

### 1. Volatile Variable Extractor (`internal/compiler/buster_detector.go`)
Identifies non-deterministic dynamic tokens injected into prompt preambles:
- Timestamps (ISO8601, RFC3339, natural dates, Unix epoch).
- Session IDs, request IDs, conversation hashes, and UUIDs.
- Nonce and transaction seeds.

These tokens are replaced with invariant placeholders (e.g., `[DYNAMIC_TIMESTAMP_UTC]`, `[DYNAMIC_SESSION_ID]`) in the system prompt. The actual dynamic values are packaged and appended to the final user turn suffix. The model receives all runtime context while the upstream prompt prefix remains byte-for-byte identical across runs.

### 2. Deterministic Tool Schema Canonicalizer (`internal/compiler/tool_canonicalizer.go`)
Prevents tool schema serialization drift:
- Stably sorts tool definitions alphabetically by name.
- Recursively sorts object properties and required parameter arrays.
- Strips redundant non-semantic whitespace.

### 3. Smart Boundary Padder (`internal/compiler/boundary_padder.go`)
Anthropic enforces a minimum prompt caching threshold of 1,024 tokens for Claude 3.5 Sonnet and Haiku, and 2,048 tokens for Claude 3 Opus. Prompts with 950 tokens receive a 0% cache discount because they fall short of the threshold.

When a stable prefix falls within the padding window (e.g., 874 to 1,023 tokens), `prefixguard` appends certified semantic invariants (such as formatting directives and reasoning consistency guidelines) to cross the 1,024-token boundary. This triggers the provider KV-cache creation on request 1 and delivers cache hits on subsequent requests.

### 4. Transparent SSE Forwarder (`internal/proxy/sse_forwarder.go`)
Streaming responses are forwarded to clients with zero buffering delay:
- Measures Time To First Token (TTFT) from upstream.
- Parses token usage from provider events (`message_start`, `message_delta`, OpenAI chunk usage).
- Records `cache_read_input_tokens`, `cache_creation_input_tokens`, and uncached input tokens without blocking client delivery.

### 5. Embedded FinOps Ledger (`internal/finops/store.go`, `internal/finops/ledger.go`)
Uses pure Go SQLite (`modernc.org/sqlite`) without CGO:
- Records request IDs, models, token counts, TTFT, and latency.
- Computes baseline unoptimized costs versus actual cached costs using exact provider pricing tables.
- Exposes metrics via REST API, Server-Sent Events, and Prometheus exposition format (`/metrics`).
