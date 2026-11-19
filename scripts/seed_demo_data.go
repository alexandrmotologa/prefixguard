package main

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/alexandrmotologa/prefixguard/internal/compiler"
	"github.com/alexandrmotologa/prefixguard/internal/finops"
	"github.com/alexandrmotologa/prefixguard/internal/tokenizer"
)

func main() {
	dbPath := "prefixguard.db"
	store, err := finops.NewStore(dbPath)
	if err != nil {
		panic(err)
	}
	defer store.Close()

	ledger := finops.NewLedger(store)

	teams := []string{"quant-trading", "rag-agents", "code-copilot", "customer-support"}
	projects := []string{"alpha-gen", "doc-search", "pr-reviewer", "helpdesk-v2"}
	models := []string{"claude-3-5-sonnet", "claude-3-5-haiku", "deepseek-chat", "gpt-4o"}

	now := time.Now()

	// Seed 60 realistic transactions over the past 2 hours
	for i := 0; i < 60; i++ {
		tIdx := rand.Intn(len(teams))
		mIdx := rand.Intn(len(models))
		model := models[mIdx]
		team := teams[tIdx]
		project := projects[tIdx]

		reqTime := now.Add(-time.Duration(60-i) * 2 * time.Minute)
		isHit := i > 2 // first couple are writes, rest are cache hits

		var cacheRead, cacheWrite, uncached int
		if isHit {
			cacheRead = 1024 + rand.Intn(2048)
			cacheWrite = 0
			uncached = 35 + rand.Intn(80)
		} else {
			cacheRead = 0
			cacheWrite = 1024 + rand.Intn(2048)
			uncached = 40
		}
		output := 80 + rand.Intn(250)

		rawCost, actualCost, savedUSD := ledger.CalculateCost(model, uncached, cacheRead, cacheWrite, output)

		ttft := 220 + rand.Intn(120)
		if !isHit {
			ttft = 2800 + rand.Intn(900)
		}

		rec := finops.RequestRecord{
			ID:               fmt.Sprintf("req_%d_%d", reqTime.UnixNano(), i),
			Timestamp:        reqTime,
			Model:            model,
			Provider:         "anthropic",
			TeamID:           team,
			ProjectID:        project,
			Environment:      "production",
			PrefixHash:       tokenizer.PrefixHashHex(fmt.Sprintf("prefix_team_%s", team)),
			UncachedTokens:   uncached,
			CacheReadTokens:  cacheRead,
			CacheWriteTokens: cacheWrite,
			OutputTokens:     output,
			RawCostUSD:       rawCost,
			ActualCostUSD:    actualCost,
			SavedCostUSD:     savedUSD,
			TTFTMs:           ttft,
			LatencyMs:        ttft + (output * 15),
			BustersCount:     1 + rand.Intn(3),
			WasPadded:        rand.Float32() < 0.25,
		}

		busters := []compiler.DetectedBuster{
			{Type: compiler.BusterTimestamp, Value: reqTime.Format(time.RFC3339), Placeholder: "[DYNAMIC_TIMESTAMP_UTC]"},
			{Type: compiler.BusterSessionID, Value: fmt.Sprintf("sess_%x", rand.Int63()), Placeholder: "[DYNAMIC_SESSION_ID]"},
		}

		_ = ledger.Record(rec, busters)
	}

	fmt.Println("✓ Seeded authentic FinOps telemetry records into prefixguard.db")
}
