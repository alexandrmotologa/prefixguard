package server

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/alexandrmotologa/prefixguard/internal/compiler"
	"github.com/alexandrmotologa/prefixguard/internal/config"
	"github.com/alexandrmotologa/prefixguard/internal/finops"
	"github.com/alexandrmotologa/prefixguard/internal/warmer"
)

// APIHandler exposes management and telemetry endpoints.
type APIHandler struct {
	ledger     *finops.Ledger
	hub        *SSEHub
	normalizer *compiler.TopologyNormalizer
	warmer     *warmer.CacheWarmer
	cfg        config.Config
}

// NewAPIHandler initializes the API router.
func NewAPIHandler(cfg config.Config, ledger *finops.Ledger, hub *SSEHub, cacheWarmer *warmer.CacheWarmer) *APIHandler {
	return &APIHandler{
		ledger:     ledger,
		hub:        hub,
		normalizer: compiler.NewTopologyNormalizer(cfg),
		warmer:     cacheWarmer,
		cfg:        cfg,
	}
}

// RegisterRoutes registers all API routes onto an http.ServeMux.
func (h *APIHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/healthz", h.handleHealthz)
	mux.HandleFunc("/metrics", h.handleMetrics)
	mux.HandleFunc("/api/finops/summary", h.handleSummary)
	mux.HandleFunc("/api/finops/chargeback", h.handleChargeback)
	mux.HandleFunc("/api/finops/export.csv", h.handleExportCSV)
	mux.HandleFunc("/api/finops/requests", h.handleRecentRequests)
	mux.HandleFunc("/api/finops/busters", h.handleBusterStats)
	mux.HandleFunc("/api/finops/stream", h.hub.ServeHTTP)
	mux.HandleFunc("/api/analyze", h.handleAnalyze)
	mux.HandleFunc("/api/warmer/register", h.handleWarmerRegister)
	mux.HandleFunc("/api/warmer/status", h.handleWarmerStatus)
}

func (h *APIHandler) handleHealthz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"healthy","service":"prefixguard"}`))
}

func (h *APIHandler) handleMetrics(w http.ResponseWriter, r *http.Request) {
	sum, err := h.ledger.GetSummary()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/plain; version=0.0.4")
	w.Write([]byte(finops.ExportPrometheus(sum)))
}

func (h *APIHandler) handleSummary(w http.ResponseWriter, r *http.Request) {
	sum, err := h.ledger.GetSummary()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(sum)
}

func (h *APIHandler) handleChargeback(w http.ResponseWriter, r *http.Request) {
	cb, err := h.ledger.GetChargebackSummary()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(cb)
}

func (h *APIHandler) handleExportCSV(w http.ResponseWriter, r *http.Request) {
	records, err := h.ledger.GetRecentRequests(500)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=prefixguard_finops_%s.csv", time.Now().Format("20060102_150405")))

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Header row
	_ = writer.Write([]string{
		"RequestID", "Timestamp", "TeamID", "ProjectID", "Environment", "Model", "Provider",
		"PrefixHash", "UncachedTokens", "CacheReadTokens", "CacheWriteTokens", "OutputTokens",
		"RawCostUSD", "ActualCostUSD", "SavedCostUSD", "TTFT_Ms", "Latency_Ms", "BustersFixed", "WasPadded",
	})

	for _, rec := range records {
		_ = writer.Write([]string{
			rec.ID,
			rec.Timestamp.Format(time.RFC3339),
			rec.TeamID,
			rec.ProjectID,
			rec.Environment,
			rec.Model,
			rec.Provider,
			rec.PrefixHash,
			strconv.Itoa(rec.UncachedTokens),
			strconv.Itoa(rec.CacheReadTokens),
			strconv.Itoa(rec.CacheWriteTokens),
			strconv.Itoa(rec.OutputTokens),
			fmt.Sprintf("%.6f", rec.RawCostUSD),
			fmt.Sprintf("%.6f", rec.ActualCostUSD),
			fmt.Sprintf("%.6f", rec.SavedCostUSD),
			strconv.Itoa(rec.TTFTMs),
			strconv.Itoa(rec.LatencyMs),
			strconv.Itoa(rec.BustersCount),
			strconv.FormatBool(rec.WasPadded),
		})
	}
}

func (h *APIHandler) handleRecentRequests(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	records, err := h.ledger.GetRecentRequests(limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(records)
}

func (h *APIHandler) handleBusterStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.ledger.GetBusterStats()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(stats)
}

// AnalyzeResponse holds the result of inspecting and compiling a test prompt.
type AnalyzeResponse struct {
	OriginalBody   string                      `json:"original_body"`
	OptimizedBody  string                      `json:"optimized_body"`
	Report         *compiler.CompilationReport `json:"report"`
	EstimatedCache string                      `json:"estimated_cache"`
}

func (h *APIHandler) handleAnalyze(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "read body failed", http.StatusBadRequest)
		return
	}

	optimizedBytes, report, err := h.normalizer.Compile(body)
	if err != nil {
		http.Error(w, "compilation failed: "+err.Error(), http.StatusBadRequest)
		return
	}

	var estStatus string
	if report.EstimatedHitRate >= 0.85 {
		estStatus = "High Cache Hit Expected (>85%)"
	} else if report.EstimatedHitRate > 0.50 {
		estStatus = "Moderate Cache Hit Expected"
	} else {
		estStatus = "Cache Miss Likely (Sub-threshold or unaligned)"
	}

	resp := AnalyzeResponse{
		OriginalBody:   string(body),
		OptimizedBody:  string(optimizedBytes),
		Report:         report,
		EstimatedCache: estStatus,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(resp)
}

func (h *APIHandler) handleWarmerRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "read body failed", http.StatusBadRequest)
		return
	}

	var pMap map[string]interface{}
	_ = json.Unmarshal(body, &pMap)
	model := fmt.Sprint(pMap["model"])
	if model == "" {
		model = "claude-3-5-sonnet"
	}

	hash := h.warmer.Register(model, body)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "registered",
		"hash":   hash,
	})
}

func (h *APIHandler) handleWarmerStatus(w http.ResponseWriter, r *http.Request) {
	status := h.warmer.GetStatus()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}
