package tokenizer

import (
	"testing"
)

func TestEstimateTokens(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		minRange int
		maxRange int
	}{
		{
			name:     "empty",
			input:    "",
			minRange: 0,
			maxRange: 0,
		},
		{
			name:     "simple sentence",
			input:    "You are a helpful AI assistant with expert coding capabilities.",
			minRange: 8,
			maxRange: 16,
		},
		{
			name: "structured json block",
			input: `{
				"model": "claude-3-5-sonnet",
				"system": "You are a specialized financial analyst.",
				"tools": [{"name": "get_stock_quote", "description": "Fetches real-time price"}]
			}`,
			minRange: 25,
			maxRange: 55,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := EstimateTokens(tt.input)
			if got < tt.minRange || got > tt.maxRange {
				t.Errorf("EstimateTokens() = %d, expected between %d and %d", got, tt.minRange, tt.maxRange)
			}
		})
	}
}

func TestPrefixHash(t *testing.T) {
	p1 := "You are a helpful coding assistant."
	p2 := "You are a helpful coding assistant."
	p3 := "You are a helpful coding assistant with differences."

	if PrefixHash(p1) != PrefixHash(p2) {
		t.Errorf("expected matching hash for identical prefixes")
	}
	if PrefixHash(p1) == PrefixHash(p3) {
		t.Errorf("expected different hash for differing prefixes")
	}

	hexHash := PrefixHashHex(p1)
	if len(hexHash) == 0 {
		t.Errorf("expected non-empty hex hash")
	}
}
