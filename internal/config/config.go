package config

import (
	"encoding/json"
	"fmt"
	"os"
)

// ProviderType identifies the upstream LLM API protocol.
type ProviderType string

const (
	ProviderAnthropic ProviderType = "anthropic"
	ProviderOpenAI    ProviderType = "openai"
	ProviderDeepSeek  ProviderType = "deepseek"
)

// CustomBusterRule allows teams to configure application-specific volatile dynamic variables.
type CustomBusterRule struct {
	Name        string `json:"name"`
	Pattern     string `json:"pattern"`
	Placeholder string `json:"placeholder"`
}

// Config represents runtime configuration settings for prefixguard.
type Config struct {
	Port               int                `json:"port"`
	UpstreamURL        string             `json:"upstream_url"`
	Provider           ProviderType       `json:"provider"`
	DBPath             string             `json:"db_path"`
	AutoCacheControl   bool               `json:"auto_cache_control"`
	AutoAlignBoundary  bool               `json:"auto_align_boundary"`
	AutoIsolateBusters bool               `json:"auto_isolate_busters"`
	AutoCanonicalize   bool               `json:"auto_canonicalize"`
	MinCacheThreshold  int                `json:"min_cache_threshold"`
	PaddingMargin      int                `json:"padding_margin"` // e.g. pad if tokens between [1024-padding_margin, 1023]
	ApiKeyOverride     string             `json:"api_key_override,omitempty"`
	CustomBusters      []CustomBusterRule `json:"custom_busters,omitempty"`
	EnableWarmer       bool               `json:"enable_warmer"`
	WarmerIntervalSec  int                `json:"warmer_interval_sec"`
}

// DefaultConfig returns reasonable defaults for enterprise workloads.
func DefaultConfig() Config {
	return Config{
		Port:               8585,
		UpstreamURL:        "https://api.anthropic.com",
		Provider:           ProviderAnthropic,
		DBPath:             "prefixguard.db",
		AutoCacheControl:   true,
		AutoAlignBoundary:  true,
		AutoIsolateBusters:  true,
		AutoCanonicalize:   true,
		MinCacheThreshold:  1024,
		PaddingMargin:      150,
		ApiKeyOverride:     "",
		EnableWarmer:       false,
		WarmerIntervalSec:  270, // 4.5 minutes (Anthropic TTL is 5 minutes)
		CustomBusters: []CustomBusterRule{
			{
				Name:        "user_id",
				Pattern:     `\b(?:usr|user|customer)[-_][a-zA-Z0-9]{6,32}\b`,
				Placeholder: "[DYNAMIC_USER_ID]",
			},
			{
				Name:        "account_id",
				Pattern:     `\b(?:acc|account|tenant|org)[-_][a-zA-Z0-9]{6,32}\b`,
				Placeholder: "[DYNAMIC_ACCOUNT_ID]",
			},
		},
	}
}

// LoadConfigFromFile loads configuration from a JSON file.
func LoadConfigFromFile(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config file: %w", err)
	}
	cfg := DefaultConfig()
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse config json: %w", err)
	}
	return &cfg, nil
}
