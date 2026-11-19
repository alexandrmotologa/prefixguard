package finops

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

// RequestRecord stores telemetry for an executed inference request.
type RequestRecord struct {
	ID               string    `json:"id"`
	Timestamp        time.Time `json:"timestamp"`
	Model            string    `json:"model"`
	Provider         string    `json:"provider"`
	TeamID           string    `json:"team_id"`
	ProjectID        string    `json:"project_id"`
	Environment      string    `json:"environment"`
	PrefixHash       string    `json:"prefix_hash"`
	UncachedTokens   int       `json:"uncached_tokens"`
	CacheReadTokens  int       `json:"cache_read_tokens"`
	CacheWriteTokens int       `json:"cache_write_tokens"`
	OutputTokens     int       `json:"output_tokens"`
	RawCostUSD       float64   `json:"raw_cost_usd"`
	ActualCostUSD    float64   `json:"actual_cost_usd"`
	SavedCostUSD     float64   `json:"saved_cost_usd"`
	TTFTMs           int       `json:"ttft_ms"`
	LatencyMs        int       `json:"latency_ms"`
	BustersCount     int       `json:"busters_count"`
	WasPadded        bool      `json:"was_padded"`
}

// BusterRecord records a single dynamic variable extracted from a request.
type BusterRecord struct {
	ID         int64     `json:"id"`
	RequestID  string    `json:"request_id"`
	BusterType string    `json:"buster_type"`
	RawValue   string    `json:"raw_value"`
	CreatedAt  time.Time `json:"created_at"`
}

// TeamChargeback captures cost and savings distribution per team.
type TeamChargeback struct {
	TeamID            string  `json:"team_id"`
	TotalRequests     int64   `json:"total_requests"`
	TotalTokens       int64   `json:"total_tokens"`
	CacheHitTokens    int64   `json:"cache_hit_tokens"`
	CacheHitRate      float64 `json:"cache_hit_rate"`
	TotalRawCostUSD   float64 `json:"total_raw_cost_usd"`
	TotalActualUSD    float64 `json:"total_actual_usd"`
	TotalSavedUSD     float64 `json:"total_saved_usd"`
	SavingsPercentage float64 `json:"savings_percentage"`
}

// Store wraps the embedded SQLite database connection.
type Store struct {
	db *sql.DB
}

// NewStore initializes the SQLite database schema.
func NewStore(dbPath string) (*Store, error) {
	if dbPath == "" {
		dbPath = "prefixguard.db"
	}
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open sqlite db: %w", err)
	}

	pragmas := []string{
		"PRAGMA journal_mode=WAL;",
		"PRAGMA synchronous=NORMAL;",
		"PRAGMA busy_timeout=5000;",
	}
	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			return nil, fmt.Errorf("exec pragma %s: %w", p, err)
		}
	}

	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		return nil, fmt.Errorf("migrate db: %w", err)
	}

	return s, nil
}

// Close closes the database connection.
func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) migrate() error {
	query := `
	CREATE TABLE IF NOT EXISTS requests (
		id TEXT PRIMARY KEY,
		timestamp DATETIME NOT NULL,
		model TEXT NOT NULL,
		provider TEXT NOT NULL,
		team_id TEXT NOT NULL DEFAULT 'default',
		project_id TEXT NOT NULL DEFAULT 'default',
		environment TEXT NOT NULL DEFAULT 'production',
		prefix_hash TEXT NOT NULL,
		uncached_tokens INTEGER NOT NULL,
		cache_read_tokens INTEGER NOT NULL,
		cache_write_tokens INTEGER NOT NULL,
		output_tokens INTEGER NOT NULL,
		raw_cost_usd REAL NOT NULL,
		actual_cost_usd REAL NOT NULL,
		saved_cost_usd REAL NOT NULL,
		ttft_ms INTEGER NOT NULL,
		latency_ms INTEGER NOT NULL,
		busters_count INTEGER NOT NULL,
		was_padded INTEGER NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
	CREATE INDEX IF NOT EXISTS idx_requests_prefix_hash ON requests(prefix_hash);
	CREATE INDEX IF NOT EXISTS idx_requests_team ON requests(team_id);
	CREATE INDEX IF NOT EXISTS idx_requests_project ON requests(project_id);

	CREATE TABLE IF NOT EXISTS busters (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		request_id TEXT NOT NULL,
		buster_type TEXT NOT NULL,
		raw_value TEXT NOT NULL,
		created_at DATETIME NOT NULL,
		FOREIGN KEY(request_id) REFERENCES requests(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_busters_request_id ON busters(request_id);
	CREATE INDEX IF NOT EXISTS idx_busters_type ON busters(buster_type);
	`
	_, err := s.db.Exec(query)
	return err
}
