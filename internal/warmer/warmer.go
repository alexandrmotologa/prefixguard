package warmer

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/alexandrmotologa/prefixguard/internal/config"
	"github.com/alexandrmotologa/prefixguard/internal/tokenizer"
)

// WarmedPrefix describes an active prefix registered for automated keep-alive heartbeats.
type WarmedPrefix struct {
	Hash       string    `json:"hash"`
	Model      string    `json:"model"`
	RawPayload []byte    `json:"-"`
	LastPing   time.Time `json:"last_ping"`
	PingCount  int64     `json:"ping_count"`
	Active     bool      `json:"active"`
}

// CacheWarmer runs periodic synthetic keep-alive pings to keep frontier KV caches hot.
type CacheWarmer struct {
	cfg        config.Config
	client     *http.Client
	prefixes   map[string]*WarmedPrefix
	mu         sync.RWMutex
	stopChan   chan struct{}
	isRunning  bool
}

// NewCacheWarmer initializes a cache warmer instance.
func NewCacheWarmer(cfg config.Config) *CacheWarmer {
	intervalSec := cfg.WarmerIntervalSec
	if intervalSec <= 0 {
		intervalSec = 270 // 4.5 minutes
	}
	cfg.WarmerIntervalSec = intervalSec

	return &CacheWarmer{
		cfg:      cfg,
		client:   &http.Client{Timeout: 15 * time.Second},
		prefixes: make(map[string]*WarmedPrefix),
		stopChan: make(chan struct{}),
	}
}

// Register adds or updates an active prefix payload for keep-alive refresh.
func (w *CacheWarmer) Register(model string, payload []byte) string {
	w.mu.Lock()
	defer w.mu.Unlock()

	hash := tokenizer.PrefixHashHex(string(payload))
	if existing, ok := w.prefixes[hash]; ok {
		existing.Active = true
		return hash
	}

	w.prefixes[hash] = &WarmedPrefix{
		Hash:       hash,
		Model:      model,
		RawPayload: payload,
		LastPing:   time.Now(),
		PingCount:  0,
		Active:     true,
	}
	return hash
}

// GetStatus returns the list of currently warmed prefixes.
func (w *CacheWarmer) GetStatus() []WarmedPrefix {
	w.mu.RLock()
	defer w.mu.RUnlock()

	list := make([]WarmedPrefix, 0, len(w.prefixes))
	for _, p := range w.prefixes {
		list = append(list, *p)
	}
	return list
}

// Start launches the background keep-alive loop.
func (w *CacheWarmer) Start() {
	w.mu.Lock()
	if w.isRunning {
		w.mu.Unlock()
		return
	}
	w.isRunning = true
	w.mu.Unlock()

	interval := time.Duration(w.cfg.WarmerIntervalSec) * time.Second
	ticker := time.NewTicker(interval)

	go func() {
		for {
			select {
			case <-ticker.C:
				w.executeHeartbeats()
			case <-w.stopChan:
				ticker.Stop()
				return
			}
		}
	}()
}

// Stop shuts down the warmer background daemon.
func (w *CacheWarmer) Stop() {
	w.mu.Lock()
	defer w.mu.Unlock()
	if !w.isRunning {
		return
	}
	close(w.stopChan)
	w.isRunning = false
}

func (w *CacheWarmer) executeHeartbeats() {
	w.mu.RLock()
	activeList := make([]*WarmedPrefix, 0, len(w.prefixes))
	for _, p := range w.prefixes {
		if p.Active {
			activeList = append(activeList, p)
		}
	}
	w.mu.RUnlock()

	for _, wp := range activeList {
		w.sendPing(wp)
	}
}

func (w *CacheWarmer) sendPing(wp *WarmedPrefix) {
	var payload map[string]interface{}
	if err := json.Unmarshal(wp.RawPayload, &payload); err != nil {
		return
	}

	// Restrict output tokens to 1 to minimize token cost during keep-alive ping
	payload["max_tokens"] = 1
	payload["messages"] = []map[string]interface{}{
		{"role": "user", "content": "ping"},
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return
	}

	targetURL := fmt.Sprintf("%s/v1/messages", w.cfg.UpstreamURL)
	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, targetURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if w.cfg.ApiKeyOverride != "" {
		req.Header.Set("x-api-key", w.cfg.ApiKeyOverride)
	}

	resp, err := w.client.Do(req)
	if err == nil {
		resp.Body.Close()
		w.mu.Lock()
		wp.LastPing = time.Now()
		wp.PingCount++
		w.mu.Unlock()
	}
}
