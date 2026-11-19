package finops

import (
	"fmt"
	"strings"
)

// ExportPrometheus formats current FinOps metrics as Prometheus exposition text.
func ExportPrometheus(sum FinOpsSummary) string {
	var sb strings.Builder

	sb.WriteString("# HELP prefixguard_requests_total Total number of intercepted requests.\n")
	sb.WriteString("# TYPE prefixguard_requests_total counter\n")
	sb.WriteString(fmt.Sprintf("prefixguard_requests_total %d\n\n", sum.TotalRequests))

	sb.WriteString("# HELP prefixguard_tokens_uncached_total Total uncached prompt tokens.\n")
	sb.WriteString("# TYPE prefixguard_tokens_uncached_total counter\n")
	sb.WriteString(fmt.Sprintf("prefixguard_tokens_uncached_total %d\n\n", sum.UncachedTokens))

	sb.WriteString("# HELP prefixguard_tokens_cache_read_total Total cached tokens read from KV cache.\n")
	sb.WriteString("# TYPE prefixguard_tokens_cache_read_total counter\n")
	sb.WriteString(fmt.Sprintf("prefixguard_tokens_cache_read_total %d\n\n", sum.CacheReadTokens))

	sb.WriteString("# HELP prefixguard_tokens_cache_write_total Total tokens written to KV cache.\n")
	sb.WriteString("# TYPE prefixguard_tokens_cache_write_total counter\n")
	sb.WriteString(fmt.Sprintf("prefixguard_tokens_cache_write_total %d\n\n", sum.CacheWriteTokens))

	sb.WriteString("# HELP prefixguard_cache_hit_ratio Current prompt cache hit ratio.\n")
	sb.WriteString("# TYPE prefixguard_cache_hit_ratio gauge\n")
	sb.WriteString(fmt.Sprintf("prefixguard_cache_hit_ratio %.4f\n\n", sum.OverallHitRate))

	sb.WriteString("# HELP prefixguard_cost_saved_usd_total Cumulative dollar savings.\n")
	sb.WriteString("# TYPE prefixguard_cost_saved_usd_total counter\n")
	sb.WriteString(fmt.Sprintf("prefixguard_cost_saved_usd_total %.6f\n\n", sum.TotalSavedUSD))

	sb.WriteString("# HELP prefixguard_busters_repaired_total Total dynamic buster variables relocated.\n")
	sb.WriteString("# TYPE prefixguard_busters_repaired_total counter\n")
	sb.WriteString(fmt.Sprintf("prefixguard_busters_repaired_total %d\n", sum.TotalBustersRepaired))

	return sb.String()
}
