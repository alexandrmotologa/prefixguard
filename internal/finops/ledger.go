package finops

import (
	"database/sql"
	"fmt"
	"sync"

	"github.com/alexandrmotologa/prefixguard/internal/compiler"
	"github.com/alexandrmotologa/prefixguard/internal/config"
)

// FinOpsSummary provides high-level economics and cache performance indicators.
type FinOpsSummary struct {
	TotalRequests        int64   `json:"total_requests"`
	TotalTokens          int64   `json:"total_tokens"`
	UncachedTokens       int64   `json:"uncached_tokens"`
	CacheReadTokens      int64   `json:"cache_read_tokens"`
	CacheWriteTokens     int64   `json:"cache_write_tokens"`
	OutputTokens         int64   `json:"output_tokens"`
	OverallHitRate       float64 `json:"overall_hit_rate"`
	TotalRawCostUSD      float64 `json:"total_raw_cost_usd"`
	TotalActualCostUSD   float64 `json:"total_actual_cost_usd"`
	TotalSavedUSD        float64 `json:"total_saved_usd"`
	SavingsPercentage    float64 `json:"savings_percentage"`
	AvgLatencyMs         float64 `json:"avg_latency_ms"`
	AvgTTFTMs            float64 `json:"avg_ttft_ms"`
	TotalBustersRepaired int64   `json:"total_busters_repaired"`
}

// BusterStat groups detected busters by category.
type BusterStat struct {
	BusterType string `json:"buster_type"`
	Count      int64  `json:"count"`
}

// Ledger manages financial metrics, cost calculation, and persistence.
type Ledger struct {
	store *Store
	mu    sync.Mutex
}

// NewLedger initializes a ledger on top of a store.
func NewLedger(store *Store) *Ledger {
	return &Ledger{store: store}
}

// CalculateCost computes baseline cost without caching, actual cost with caching, and net USD savings.
func (l *Ledger) CalculateCost(model string, uncached, cacheRead, cacheWrite, output int) (rawCost, actualCost, savedUSD float64) {
	pricing := config.GetPricing(model)

	totalInputTokens := uncached + cacheRead + cacheWrite
	rawCost = (float64(totalInputTokens) * pricing.BaseInputRate) + (float64(output) * pricing.OutputRate)

	actualCost = (float64(uncached) * pricing.BaseInputRate) +
		(float64(cacheRead) * pricing.CacheReadRate) +
		(float64(cacheWrite) * pricing.CacheWriteRate) +
		(float64(output) * pricing.OutputRate)

	savedUSD = rawCost - actualCost
	if savedUSD < 0 {
		savedUSD = 0
	}
	return rawCost, actualCost, savedUSD
}

// Record saves an inference transaction and associated busters into SQLite.
func (l *Ledger) Record(rec RequestRecord, busters []compiler.DetectedBuster) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	tx, err := l.store.db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	paddedInt := 0
	if rec.WasPadded {
		paddedInt = 1
	}

	if rec.TeamID == "" {
		rec.TeamID = "default"
	}
	if rec.ProjectID == "" {
		rec.ProjectID = "default"
	}
	if rec.Environment == "" {
		rec.Environment = "production"
	}

	query := `
	INSERT INTO requests (
		id, timestamp, model, provider, team_id, project_id, environment, prefix_hash,
		uncached_tokens, cache_read_tokens, cache_write_tokens, output_tokens,
		raw_cost_usd, actual_cost_usd, saved_cost_usd,
		ttft_ms, latency_ms, busters_count, was_padded
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
	`
	_, err = tx.Exec(query,
		rec.ID, rec.Timestamp, rec.Model, rec.Provider, rec.TeamID, rec.ProjectID, rec.Environment, rec.PrefixHash,
		rec.UncachedTokens, rec.CacheReadTokens, rec.CacheWriteTokens, rec.OutputTokens,
		rec.RawCostUSD, rec.ActualCostUSD, rec.SavedCostUSD,
		rec.TTFTMs, rec.LatencyMs, rec.BustersCount, paddedInt,
	)
	if err != nil {
		return fmt.Errorf("insert request: %w", err)
	}

	if len(busters) > 0 {
		stmt, err := tx.Prepare(`INSERT INTO busters (request_id, buster_type, raw_value, created_at) VALUES (?, ?, ?, ?);`)
		if err != nil {
			return fmt.Errorf("prepare buster insert: %w", err)
		}
		defer stmt.Close()

		for _, b := range busters {
			if _, err := stmt.Exec(rec.ID, string(b.Type), b.Value, rec.Timestamp); err != nil {
				return fmt.Errorf("insert buster: %w", err)
			}
		}
	}

	return tx.Commit()
}

// GetSummary compiles cumulative financial and token metrics.
func (l *Ledger) GetSummary() (FinOpsSummary, error) {
	query := `
	SELECT
		COUNT(*),
		COALESCE(SUM(uncached_tokens), 0),
		COALESCE(SUM(cache_read_tokens), 0),
		COALESCE(SUM(cache_write_tokens), 0),
		COALESCE(SUM(output_tokens), 0),
		COALESCE(SUM(raw_cost_usd), 0),
		COALESCE(SUM(actual_cost_usd), 0),
		COALESCE(SUM(saved_cost_usd), 0),
		COALESCE(AVG(latency_ms), 0),
		COALESCE(AVG(ttft_ms), 0),
		COALESCE(SUM(busters_count), 0)
	FROM requests;
	`
	var sum FinOpsSummary
	row := l.store.db.QueryRow(query)
	err := row.Scan(
		&sum.TotalRequests,
		&sum.UncachedTokens,
		&sum.CacheReadTokens,
		&sum.CacheWriteTokens,
		&sum.OutputTokens,
		&sum.TotalRawCostUSD,
		&sum.TotalActualCostUSD,
		&sum.TotalSavedUSD,
		&sum.AvgLatencyMs,
		&sum.AvgTTFTMs,
		&sum.TotalBustersRepaired,
	)
	if err != nil && err != sql.ErrNoRows {
		return sum, fmt.Errorf("query summary: %w", err)
	}

	sum.TotalTokens = sum.UncachedTokens + sum.CacheReadTokens + sum.CacheWriteTokens + sum.OutputTokens
	totalInput := sum.UncachedTokens + sum.CacheReadTokens + sum.CacheWriteTokens

	if totalInput > 0 {
		sum.OverallHitRate = float64(sum.CacheReadTokens) / float64(totalInput)
	}

	if sum.TotalRawCostUSD > 0 {
		sum.SavingsPercentage = (sum.TotalSavedUSD / sum.TotalRawCostUSD) * 100.0
	}

	return sum, nil
}

// GetChargebackSummary returns FinOps metrics grouped by team.
func (l *Ledger) GetChargebackSummary() ([]TeamChargeback, error) {
	query := `
	SELECT
		team_id,
		COUNT(*) as req_count,
		COALESCE(SUM(uncached_tokens + cache_read_tokens + cache_write_tokens + output_tokens), 0) as total_toks,
		COALESCE(SUM(cache_read_tokens), 0) as hit_toks,
		COALESCE(SUM(raw_cost_usd), 0) as raw_usd,
		COALESCE(SUM(actual_cost_usd), 0) as act_usd,
		COALESCE(SUM(saved_cost_usd), 0) as sav_usd
	FROM requests
	GROUP BY team_id
	ORDER BY sav_usd DESC;
	`
	rows, err := l.store.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("query chargeback: %w", err)
	}
	defer rows.Close()

	var list []TeamChargeback
	for rows.Next() {
		var c TeamChargeback
		err := rows.Scan(
			&c.TeamID,
			&c.TotalRequests,
			&c.TotalTokens,
			&c.CacheHitTokens,
			&c.TotalRawCostUSD,
			&c.TotalActualUSD,
			&c.TotalSavedUSD,
		)
		if err != nil {
			return nil, fmt.Errorf("scan chargeback row: %w", err)
		}
		if c.TotalTokens > 0 {
			c.CacheHitRate = float64(c.CacheHitTokens) / float64(c.TotalTokens)
		}
		if c.TotalRawCostUSD > 0 {
			c.SavingsPercentage = (c.TotalSavedUSD / c.TotalRawCostUSD) * 100.0
		}
		list = append(list, c)
	}
	return list, nil
}

// GetRecentRequests returns the latest N inference requests.
func (l *Ledger) GetRecentRequests(limit int) ([]RequestRecord, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `
	SELECT
		id, timestamp, model, provider, team_id, project_id, environment, prefix_hash,
		uncached_tokens, cache_read_tokens, cache_write_tokens, output_tokens,
		raw_cost_usd, actual_cost_usd, saved_cost_usd,
		ttft_ms, latency_ms, busters_count, was_padded
	FROM requests
	ORDER BY timestamp DESC
	LIMIT ?;
	`
	rows, err := l.store.db.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("query recent requests: %w", err)
	}
	defer rows.Close()

	var records []RequestRecord
	for rows.Next() {
		var r RequestRecord
		var paddedInt int
		err := rows.Scan(
			&r.ID, &r.Timestamp, &r.Model, &r.Provider, &r.TeamID, &r.ProjectID, &r.Environment, &r.PrefixHash,
			&r.UncachedTokens, &r.CacheReadTokens, &r.CacheWriteTokens, &r.OutputTokens,
			&r.RawCostUSD, &r.ActualCostUSD, &r.SavedCostUSD,
			&r.TTFTMs, &r.LatencyMs, &r.BustersCount, &paddedInt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan request row: %w", err)
		}
		r.WasPadded = paddedInt == 1
		records = append(records, r)
	}
	return records, nil
}

// GetBusterStats aggregates detected buster categories.
func (l *Ledger) GetBusterStats() ([]BusterStat, error) {
	query := `
	SELECT buster_type, COUNT(*) as cnt
	FROM busters
	GROUP BY buster_type
	ORDER BY cnt DESC;
	`
	rows, err := l.store.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("query buster stats: %w", err)
	}
	defer rows.Close()

	var stats []BusterStat
	for rows.Next() {
		var s BusterStat
		if err := rows.Scan(&s.BusterType, &s.Count); err != nil {
			return nil, fmt.Errorf("scan buster stat: %w", err)
		}
		stats = append(stats, s)
	}
	return stats, nil
}
