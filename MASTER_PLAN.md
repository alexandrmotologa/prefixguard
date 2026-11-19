# prefixguard: Architecture and Engineering Master Plan
> Zero-Invalidation Prompt Cache Optimizer, Token-Boundary Compiler, and FinOps Reverse Proxy for Frontier LLMs
> Target: Zero-CGO Single-Binary Go Engine (< 15MB RAM, < 1ms overhead) with Embedded React 19 Cache Studio and Hot-Boundary Inspector

## 1. Problem Statement and Motivation

### 1.1 The Multi-Million Dollar Prompt Caching Inefficiency
Frontier AI providers (Anthropic, DeepSeek, OpenAI) support prompt caching to reuse KV-cache at the model prefix level. This delivers two primary advantages:
- Up to 90% cost reduction on cached prompt tokens. Anthropic charges $0.30 per 1M cached prompt tokens versus $3.00 for uncached input.
- Sub-second Time To First Token (TTFT). Eliminating prefill computation drops TTFT from 3,000ms-8,000ms down to sub-300ms.

In real-world production deployments, typical developer practices break prompt caching on almost all requests:
1. Volatile Preamble Injections: Applications routinely inject dynamic variables at the beginning of system prompts (e.g., timestamps like `Current time: 2026-11-19 20:02:15 UTC`, session IDs, or fluctuating user metadata). Because prompt caching requires exact token-for-token byte prefix identity, mutating a single token in character 15 invalidates the entire downstream cache block.
2. Unstable Tool and Function Ordering: When agent frameworks (LangChain, LlamaIndex, custom agents) serialize available tools, dictionary key ordering or dynamically filtered tool lists shift positions across runs, destroying cache reuse.
3. Sub-Threshold Minimum Token Drop: Anthropic enforces a strict minimum threshold (1,024 tokens for Claude 3.5 Sonnet, 2,048 for Opus). Prompts with 950 tokens receive 0% cache discount because they fall short of the quantization boundary.
4. Missing Cache Control Breakpoints: Anthropic requires explicit `cache_control: {"type": "ephemeral"}` markers on up to 4 message/tool blocks. Developers frequently miss configuring these markers.
5. Zero Developer Observability: Teams lack visibility into actual cache hit ratios. They only notice when monthly API invoices are higher than budgeted.

### 1.2 The prefixguard Solution
`prefixguard` is a transparent, wire-speed reverse proxy written in Go that optimizes prompt topologies on the wire in sub-millisecond time before forwarding to upstream providers:
- Canonical Prompt Structure Normalization: Separates static invariant prompts from volatile dynamic contexts. Reorders message components so static system instructions, canonicalized tool manifests, and few-shot examples form an immutable prefix, pushing volatile parameters (timestamps, session state) to the suffix.
- Deterministic Tool Schema Canonicalizer: Sorts tool definitions alphabetically, normalizes schema keys, strips non-semantic whitespace, and guarantees identical byte representation across invocations.
- Smart Token Boundary Alignment: When a stable prefix sits just below provider cache thresholds (e.g., 950 tokens), appends certified non-interfering invariants to cross the 1,024-token boundary, turning a 0% cache miss into an 85%+ cache hit.
- Automatic Provider Cache Injection: Automatically inserts Anthropic `cache_control` markers at the optimal static boundary without requiring agent code changes.
- FinOps Ledger and Real-Time Cache Studio: Logs exact provider cache tokens (`cache_read_input_tokens`, `cache_creation_input_tokens`), tracks cumulative dollar savings in an embedded SQLite database, and exposes an interactive React 19 cockpit.

---

## 2. System Architecture

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

---

## 3. Mathematical Formulation: Cache Economics

### 3.1 Prompt Cache Hit Rate ($H_{\text{cache}}$)
For a batch of $N$ requests where $T_{\text{read}}^{(i)}$ represents cached tokens read, $T_{\text{create}}^{(i)}$ represents cache writes, and $T_{\text{uncached}}^{(i)}$ represents raw uncached tokens:

$$H_{\text{cache}} = \frac{\sum_{i=1}^N T_{\text{read}}^{(i)}}{\sum_{i=1}^N \left( T_{\text{read}}^{(i)} + T_{\text{create}}^{(i)} + T_{\text{uncached}}^{(i)} \right)}$$

### 3.2 Net FinOps Cost Savings ($S_{\text{finops}}$)
Let $P_{\text{base}}$ be the baseline input token price per token, $P_{\text{read}}$ the discounted cached token price (e.g., $0.10 \times P_{\text{base}}$), and $P_{\text{write}}$ the cache creation price (e.g., $1.25 \times P_{\text{base}}$):

$$C_{\text{unoptimized}} = \sum_{i=1}^N \Big( T_{\text{total}}^{(i)} \cdot P_{\text{base}} \Big)$$

$$C_{\text{prefixguard}} = \sum_{i=1}^N \Big( T_{\text{read}}^{(i)} \cdot P_{\text{read}} + T_{\text{create}}^{(i)} \cdot P_{\text{write}} + T_{\text{suffix}}^{(i)} \cdot P_{\text{base}} \Big)$$

$$S_{\text{finops}} = C_{\text{unoptimized}} - C_{\text{prefixguard}}$$

When $H_{\text{cache}} \ge 0.85$, net cost savings typically exceed 70% of total inference expenditures.

---

## 4. Repository Structure

```
prefixguard/
├── cmd/
│   └── prefixguard/
│       └── main.go                 # CLI entry point: serve, analyze, bench
├── internal/
│   ├── config/
│   │   ├── config.go               # Configuration parser for upstream providers and thresholds
│   │   └── pricing.go              # Model token pricing tables (Anthropic, DeepSeek, OpenAI)
│   ├── proxy/
│   │   ├── reverse.go              # Zero-allocation HTTP reverse proxy
│   │   ├── interceptor.go          # Request body rewriter and message normalizer
│   │   └── sse_forwarder.go        # Transparent Server-Sent Events streaming chunk passthrough
│   ├── compiler/
│   │   ├── buster_detector.go      # Regex and heuristic scanner isolating dynamic variables
│   │   ├── tool_canonicalizer.go   # Deterministic key sorting and minification of tool schemas
│   │   ├── boundary_padder.go      # Smart padding engine ensuring prompts cross 1024 threshold
│   │   └── normalizer.go           # Topology reorganizer: static prefix vs dynamic suffix
│   ├── tokenizer/
│   │   ├── counter.go              # Fast local token counting using BPE / tiktoken heuristics
│   │   └── hash.go                 # FNV-1a and xxHash prefix hash calculator for cache prediction
│   ├── finops/
│   │   ├── store.go                # Embedded SQLite store (modernc.org/sqlite) for cost records
│   │   ├── ledger.go               # Aggregates dollar savings, cache hit ratios, and TTFT delta
│   │   └── exporter.go             # JSON / Prometheus metrics exporter
│   └── server/
│       ├── api.go                  # Management REST API for studio telemetry
│       ├── embed.go                # Embedded React 19 studio static assets via go:embed
│       └── sse_hub.go              # Real-time event stream for live cache hit visualizer
├── web/
│   ├── src/
│   │   ├── App.tsx                 # React 19 root application
│   │   ├── components/
│   │   │   ├── CacheHitGauge.tsx   # Radial cache hit percentage dial (target: >85%)
│   │   │   ├── DollarSavingsCard.tsx # Hero card displaying net cumulative USD saved
│   │   │   ├── PrefixInspector.tsx # Visual prompt layout showing static prefix vs dynamic suffix
│   │   │   ├── CacheBusterLog.tsx  # Table of detected and repaired cache-busting variables
│   │   │   ├── LatencyComparison.tsx # Latency waterfall: Cache Hit vs Cache Miss
│   │   │   └── PromptPlayground.tsx# Live playground for prompt testing and optimization
│   │   └── pages/
│   │       └── Dashboard.tsx       # Main FinOps Cache cockpit
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── examples/
│   ├── prefixguard.yaml            # Standard enterprise configuration sample
│   ├── unstable_agent_prompt.json  # Sample raw prompt with timestamp in preamble
│   └── benchmark_traffic.go        # High-concurrency traffic generator verifying cache hit rate
├── Makefile
├── go.mod
├── go.sum
├── LICENSE
└── README.md
```

---

## 5. Detailed Implementation Tasks

### Task 1: Go Engine Foundation and Streaming Reverse Proxy
- Setup `go.mod` with zero-CGO SQLite (`modernc.org/sqlite`) and HTTP routing.
- Implement configuration parser in `internal/config/config.go` with pricing tables for Anthropic, OpenAI, and DeepSeek in `internal/config/pricing.go`.
- Implement high-performance reverse proxy in `internal/proxy/reverse.go`.
- Implement SSE forwarder in `internal/proxy/sse_forwarder.go` to stream tokens to clients without buffering delay while extracting token usage metadata upon completion.

### Task 2: Volatile Variable Detector and Heuristics
- Implement `internal/compiler/buster_detector.go` to detect:
  - ISO8601, RFC3339, Unix epoch, and human-readable timestamps.
  - UUIDs, transaction identifiers, and random nonce hashes.
  - Dynamic session metadata injected into system messages.
- Provide token extraction mechanism that relocates volatile tokens into user message suffixes.

### Task 3: Deterministic Tool Schema Canonicalizer
- Implement `internal/compiler/tool_canonicalizer.go`:
  - Alphabetically sort tools by name.
  - Recursively sort schema parameters and property definitions.
  - Strip redundant whitespace and empty description fields.
  - Produce stable byte representation for prompt caching.

### Task 4: Prefix Compiler and Token Boundary Alignment
- Implement `internal/tokenizer/counter.go` for token estimation across Claude, GPT-4, and DeepSeek.
- Implement `internal/tokenizer/hash.go` computing 64-bit prefix hash for instant cache identity tracking.
- Implement `internal/compiler/boundary_padder.go`:
  - Enforce provider-specific minimum cache boundaries (1,024 for Anthropic/OpenAI, 64 for DeepSeek).
  - Pad sub-threshold prompts with certified semantic invariants.
  - Automatically inject Anthropic `cache_control: {"type": "ephemeral"}` at the optimal boundary.
- Implement `internal/compiler/normalizer.go` orchestrating the full pipeline.

### Task 5: FinOps Accounting and SQLite Storage
- Implement `internal/finops/store.go` with SQLite schema:
  - `requests`: ID, timestamp, model, provider, uncached_tokens, cached_read_tokens, cached_write_tokens, raw_cost, optimized_cost, saved_cost, ttft_ms, latency_ms.
  - `busters`: ID, request_id, pattern_type, raw_value, position.
- Implement `internal/finops/ledger.go` for aggregated metrics:
  - Overall cache hit rate ($H_{\text{cache}}$).
  - Total USD saved and projected monthly savings.
  - Average latency reduction.
- Implement metrics endpoints in `internal/finops/exporter.go`.

### Task 6: Embedded React 19 Cache Studio
- Build React 19 web application in `web/`:
  - Real-time SSE event stream for incoming proxy traffic.
  - Radial hit rate gauge with 85%+ target threshold indicator.
  - Dollar savings hero card with cumulative FinOps metrics.
  - Prefix inspector displaying visual color-coded tokens (Static Cache Anchor in green, Dynamic Suffix in orange, Padded Tokens in blue).
  - Detected cache busters audit table.
  - Interactive prompt optimization playground.
- Configure Vite build output to `web/dist`.
- Implement `internal/server/embed.go` using `go:embed` to serve the UI directly from the binary on port 8585.

### Task 7: CLI Subcommands and Testing
- Implement `cmd/prefixguard/main.go` supporting:
  - `serve`: Run reverse proxy with embedded studio.
  - `analyze`: Run prompt analysis on a local JSON file.
  - `bench`: Run concurrent mock traffic benchmarks.
- Author unit tests for compiler, tokenizer, canonicalizer, and proxy.
- Author integration tests verifying end-to-end cache hit enhancement.
