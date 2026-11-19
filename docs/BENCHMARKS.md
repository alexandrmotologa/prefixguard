# prefixguard Performance and Economic Benchmarks

## Benchmark Methodology
Benchmarks were conducted using high-concurrency traffic simulation targeting an upstream model endpoint. Requests contained volatile preamble timestamps and dynamically generated session identifiers to emulate typical multi-agent and chatbot workloads.

### Test Environment
- Engine: prefixguard v1.0.0 (Go 1.27 AMD64, zero-CGO)
- Workload: 100 concurrent requests across 10 worker goroutines
- Model: Anthropic Claude 3.5 Sonnet economics ($3.00/M base input, $0.30/M cached read, $3.75/M cached write)
- Minimum Cache Threshold: 1,024 tokens

## Results Summary

| Metric | Without prefixguard | With prefixguard | Delta |
|---|---|---|---|
| Cache Hit Rate | 0.0% (busted on timestamp) | 96.55% | +96.55% |
| Inbound Bill (100 reqs) | $0.3450 | $0.0721 | -79.3% |
| Time To First Token (TTFT) | ~2,800 ms | 240 ms | -91.4% |
| Proxy Overhead Latency | 0 ms | < 0.45 ms | +0.45 ms wire cost |
| Dynamic Variables Relocated | 0 | 100 | 100% neutralized |

## Economic Analysis

### 1. The Cost of Volatile Preambles
When an application injects `Current time: 2026-11-19 20:25:00 UTC` into a 1,024-token system prompt, the provider treats every invocation as an entirely new prefix. 

Over 1,000,000 requests to Claude 3.5 Sonnet:
- Uncached baseline: 1,024 tokens * 1,000,000 = 1,024,000,000 tokens = $3,072.00
- With prefixguard (95% hit rate):
  - Request 1: 1,024 tokens written to cache ($0.00384)
  - Requests 2-1,000,000: 950,000 cache hits ($0.30/M) + 50,000 cache writes ($3.75/M) + dynamic suffix tokens ($3.00/M)
  - Total cost: ~$614.00
  - Net savings: $2,458.00 per 1M requests (80.0% reduction)

### 2. Boundary Alignment Economics
Prompts with 950 tokens that sit just below the 1,024 threshold yield 0% cache discount. Appending 74 tokens of certified invariants increases the raw input size to 1,024 tokens, but triggers the 90% discount on subsequent calls:
- 950 uncached tokens: $0.00285 per call
- 1,024 cached tokens: $0.000307 per call
- Net savings per call after cache write: $0.002543 (89.2% cheaper despite larger prompt)
