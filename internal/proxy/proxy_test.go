package proxy

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/alexandrmotologa/prefixguard/internal/config"
	"github.com/alexandrmotologa/prefixguard/internal/finops"
)

type mockBroadcaster struct{}

func (m *mockBroadcaster) Broadcast(eventType string, payload interface{}) {}

func TestReverseProxy_SSEFlow(t *testing.T) {
	// Mock upstream LLM server simulating Anthropic SSE response
	mockUpstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)

		flusher, ok := w.(http.Flusher)
		if !ok {
			t.Fatalf("expected flusher")
		}

		// Stream message_start with cache hit usage
		fmt.Fprintf(w, "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_1\",\"model\":\"claude-3-5-sonnet\",\"usage\":{\"input_tokens\":50,\"cache_read_input_tokens\":1024,\"cache_creation_input_tokens\":0}}}\n\n")
		flusher.Flush()

		// Stream delta
		fmt.Fprintf(w, "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"Hello from cached Claude!\"}}\n\n")
		flusher.Flush()

		// Stream message_delta with output usage
		fmt.Fprintf(w, "event: message_delta\ndata: {\"type\":\"message_delta\",\"usage\":{\"output_tokens\":25}}\n\n")
		flusher.Flush()
	}))
	defer mockUpstream.Close()

	tmpDB := "test_proxy.db"
	defer os.Remove(tmpDB)

	store, err := finops.NewStore(tmpDB)
	if err != nil {
		t.Fatalf("create store: %v", err)
	}
	defer store.Close()

	ledger := finops.NewLedger(store)
	hub := &mockBroadcaster{}

	cfg := config.DefaultConfig()
	cfg.UpstreamURL = mockUpstream.URL
	cfg.Provider = config.ProviderAnthropic

	proxy, err := NewReverseProxy(cfg, ledger, hub)
	if err != nil {
		t.Fatalf("create reverse proxy: %v", err)
	}

	rawRequest := []byte(`{
		"model": "claude-3-5-sonnet",
		"system": "You are a code assistant. Timestamp: 2026-11-19 20:20:00 UTC.",
		"messages": [{"role": "user", "content": "Ping"}]
	}`)

	req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(rawRequest))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	proxy.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
	}

	bodyStr := w.Body.String()
	if !strings.Contains(bodyStr, "Hello from cached Claude!") {
		t.Errorf("expected streaming body in response: %s", bodyStr)
	}

	// Verify overhead header was attached
	overhead := resp.Header.Get("X-PrefixGuard-Overhead-Us")
	if overhead == "" {
		t.Errorf("expected X-PrefixGuard-Overhead-Us header")
	}

	// Verify FinOps record
	summary, err := ledger.GetSummary()
	if err != nil {
		t.Fatalf("get summary: %v", err)
	}

	if summary.TotalRequests != 1 {
		t.Errorf("expected 1 recorded request, got %d", summary.TotalRequests)
	}

	if summary.CacheReadTokens != 1024 {
		t.Errorf("expected 1024 cache read tokens, got %d", summary.CacheReadTokens)
	}

	if summary.TotalSavedUSD <= 0 {
		t.Errorf("expected positive savings, got %f", summary.TotalSavedUSD)
	}
}
