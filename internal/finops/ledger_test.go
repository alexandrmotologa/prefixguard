package finops

import (
	"os"
	"testing"
	"time"

	"github.com/alexandrmotologa/prefixguard/internal/compiler"
)

func TestLedger_Lifecycle(t *testing.T) {
	tmpDB := "test_finops.db"
	defer os.Remove(tmpDB)

	store, err := NewStore(tmpDB)
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}
	defer store.Close()

	ledger := NewLedger(store)

	// Calculate cost check
	rawCost, actualCost, saved := ledger.CalculateCost("claude-3-5-sonnet", 100, 900, 0, 50)
	if rawCost <= actualCost {
		t.Errorf("expected raw cost > actual cost with caching, raw=%f, actual=%f", rawCost, actualCost)
	}
	if saved <= 0 {
		t.Errorf("expected positive savings, got %f", saved)
	}

	// Record a transaction
	rec := RequestRecord{
		ID:               "req_test_001",
		Timestamp:        time.Now(),
		Model:            "claude-3-5-sonnet",
		Provider:         "anthropic",
		PrefixHash:       "a1b2c3d4",
		UncachedTokens:   100,
		CacheReadTokens:  900,
		CacheWriteTokens: 0,
		OutputTokens:     50,
		RawCostUSD:       rawCost,
		ActualCostUSD:    actualCost,
		SavedCostUSD:     saved,
		TTFTMs:           240,
		LatencyMs:        1200,
		BustersCount:     1,
		WasPadded:        false,
	}

	busters := []compiler.DetectedBuster{
		{
			Type:  compiler.BusterTimestamp,
			Value: "2026-11-19T20:15:00Z",
		},
	}

	if err := ledger.Record(rec, busters); err != nil {
		t.Fatalf("failed to record request: %v", err)
	}

	// Query Summary
	sum, err := ledger.GetSummary()
	if err != nil {
		t.Fatalf("failed to get summary: %v", err)
	}

	if sum.TotalRequests != 1 {
		t.Errorf("expected 1 request, got %d", sum.TotalRequests)
	}

	if sum.CacheReadTokens != 900 {
		t.Errorf("expected 900 cache read tokens, got %d", sum.CacheReadTokens)
	}

	if sum.OverallHitRate < 0.85 {
		t.Errorf("expected hit rate >= 85%%, got %f", sum.OverallHitRate)
	}

	// Check buster stats
	stats, err := ledger.GetBusterStats()
	if err != nil {
		t.Fatalf("failed to get buster stats: %v", err)
	}
	if len(stats) == 0 {
		t.Fatalf("expected buster stats to contain recorded buster")
	}
	if stats[0].BusterType != string(compiler.BusterTimestamp) {
		t.Errorf("expected timestamp buster type, got %s", stats[0].BusterType)
	}

	// Check chargeback summary
	cbs, err := ledger.GetChargebackSummary()
	if err != nil {
		t.Fatalf("failed to get chargeback summary: %v", err)
	}
	if len(cbs) == 0 {
		t.Fatalf("expected at least 1 chargeback entry")
	}
	if cbs[0].TeamID != "default" {
		t.Errorf("expected default team ID, got %s", cbs[0].TeamID)
	}

	// Export Prometheus
	prom := ExportPrometheus(sum)
	if len(prom) == 0 {
		t.Errorf("expected non-empty prometheus exposition")
	}
}
