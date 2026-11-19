package warmer

import (
	"testing"

	"github.com/alexandrmotologa/prefixguard/internal/config"
)

func TestCacheWarmer_Lifecycle(t *testing.T) {
	cfg := config.DefaultConfig()
	cfg.WarmerIntervalSec = 1

	w := NewCacheWarmer(cfg)

	rawPayload := []byte(`{"model":"claude-3-5-sonnet","system":"You are an assistant."}`)
	hash := w.Register("claude-3-5-sonnet", rawPayload)

	if hash == "" {
		t.Fatalf("expected non-empty registered hash")
	}

	status := w.GetStatus()
	if len(status) != 1 {
		t.Fatalf("expected 1 warmed prefix, got %d", len(status))
	}

	if status[0].Hash != hash {
		t.Errorf("expected hash %s, got %s", hash, status[0].Hash)
	}

	w.Start()
	// Re-registering existing should keep active
	h2 := w.Register("claude-3-5-sonnet", rawPayload)
	if h2 != hash {
		t.Errorf("expected matching hash on re-register")
	}
	w.Stop()
}
