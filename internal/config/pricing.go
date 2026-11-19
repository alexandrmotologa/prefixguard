package config

// ModelPricing defines the token unit costs in USD per token.
type ModelPricing struct {
	BaseInputRate  float64 `json:"base_input_rate"`  // USD per token
	CacheWriteRate float64 `json:"cache_write_rate"` // USD per token (creation)
	CacheReadRate  float64 `json:"cache_read_rate"`  // USD per token (cache hit)
	OutputRate     float64 `json:"output_rate"`      // USD per token
	MinCacheTokens int     `json:"min_cache_tokens"` // Minimum prefix tokens required for caching
}

// DefaultPricingRegistry maps model names or prefixes to their standard FinOps pricing.
var DefaultPricingRegistry = map[string]ModelPricing{
	// Anthropic Claude 3.5 Sonnet
	"claude-3-5-sonnet": {
		BaseInputRate:  3.00 / 1_000_000,
		CacheWriteRate: 3.75 / 1_000_000,
		CacheReadRate:  0.30 / 1_000_000,
		OutputRate:     15.00 / 1_000_000,
		MinCacheTokens: 1024,
	},
	// Anthropic Claude 3.5 Haiku
	"claude-3-5-haiku": {
		BaseInputRate:  0.80 / 1_000_000,
		CacheWriteRate: 1.00 / 1_000_000,
		CacheReadRate:  0.08 / 1_000_000,
		OutputRate:     4.00 / 1_000_000,
		MinCacheTokens: 1024,
	},
	// Anthropic Claude 3 Opus
	"claude-3-opus": {
		BaseInputRate:  15.00 / 1_000_000,
		CacheWriteRate: 18.75 / 1_000_000,
		CacheReadRate:  1.50 / 1_000_000,
		OutputRate:     75.00 / 1_000_000,
		MinCacheTokens: 2048,
	},
	// DeepSeek V3 / R1
	"deepseek-chat": {
		BaseInputRate:  0.14 / 1_000_000,
		CacheWriteRate: 0.14 / 1_000_000,
		CacheReadRate:  0.014 / 1_000_000,
		OutputRate:     0.28 / 1_000_000,
		MinCacheTokens: 64,
	},
	"deepseek-reasoner": {
		BaseInputRate:  0.55 / 1_000_000,
		CacheWriteRate: 0.55 / 1_000_000,
		CacheReadRate:  0.14 / 1_000_000,
		OutputRate:     2.19 / 1_000_000,
		MinCacheTokens: 64,
	},
	// OpenAI GPT-4o
	"gpt-4o": {
		BaseInputRate:  2.50 / 1_000_000,
		CacheWriteRate: 2.50 / 1_000_000,
		CacheReadRate:  1.25 / 1_000_000,
		OutputRate:     10.00 / 1_000_000,
		MinCacheTokens: 1024,
	},
	// OpenAI GPT-4o-mini
	"gpt-4o-mini": {
		BaseInputRate:  0.15 / 1_000_000,
		CacheWriteRate: 0.15 / 1_000_000,
		CacheReadRate:  0.075 / 1_000_000,
		OutputRate:     0.60 / 1_000_000,
		MinCacheTokens: 1024,
	},
}

// GetPricing retrieves pricing metrics for a given model identifier.
func GetPricing(model string) ModelPricing {
	if p, ok := DefaultPricingRegistry[model]; ok {
		return p
	}
	// Fallback to fuzzy prefix match
	for k, v := range DefaultPricingRegistry {
		if len(model) >= len(k) && model[:len(k)] == k {
			return v
		}
	}
	// Default to standard Claude 3.5 Sonnet economics as conservative baseline
	return DefaultPricingRegistry["claude-3-5-sonnet"]
}
