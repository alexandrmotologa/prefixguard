package proxy

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync/atomic"
	"time"

	"github.com/alexandrmotologa/prefixguard/internal/compiler"
	"github.com/alexandrmotologa/prefixguard/internal/config"
	"github.com/alexandrmotologa/prefixguard/internal/finops"
)

// TelemetryBroadcaster abstracts event broadcasting to avoid package import cycles.
type TelemetryBroadcaster interface {
	Broadcast(eventType string, payload interface{})
}

// ReverseProxy handles request interception, prompt optimization, upstream forwarding, and FinOps recording.
type ReverseProxy struct {
	cfg         config.Config
	normalizer  *compiler.TopologyNormalizer
	ledger      *finops.Ledger
	hub         TelemetryBroadcaster
	forwarder   *SSEForwarder
	upstreamURL *url.URL
	client      *http.Client
}

// NewReverseProxy initializes the reverse proxy engine.
func NewReverseProxy(cfg config.Config, ledger *finops.Ledger, hub TelemetryBroadcaster) (*ReverseProxy, error) {
	u, err := url.Parse(cfg.UpstreamURL)
	if err != nil {
		return nil, fmt.Errorf("parse upstream url: %w", err)
	}

	transport := &http.Transport{
		MaxIdleConns:        1000,
		MaxIdleConnsPerHost: 200,
		IdleConnTimeout:     90 * time.Second,
		TLSClientConfig:     &tls.Config{MinVersion: tls.VersionTLS12},
		DisableCompression:  false,
		ForceAttemptHTTP2:   true,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   0, // No global timeout for long streaming LLM responses
	}

	return &ReverseProxy{
		cfg:         cfg,
		normalizer:  compiler.NewTopologyNormalizer(cfg),
		ledger:      ledger,
		hub:         hub,
		forwarder:   NewSSEForwarder(),
		upstreamURL: u,
		client:      client,
	}, nil
}

var globalReqCounter uint64

func generateRequestID() string {
	seq := atomic.AddUint64(&globalReqCounter, 1)
	return fmt.Sprintf("req_%d_%d", time.Now().UnixNano(), seq)
}

// ServeHTTP implements the reverse proxy handler.
func (p *ReverseProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	// Only intercept POST inference calls (/v1/messages, /v1/chat/completions)
	isChatEndpoint := r.Method == http.MethodPost && (strings.Contains(r.URL.Path, "messages") || strings.Contains(r.URL.Path, "chat/completions"))

	var rawBody []byte
	var compileReport *compiler.CompilationReport
	var reqID = generateRequestID()

	if isChatEndpoint && r.Body != nil {
		bodyBytes, err := io.ReadAll(r.Body)
		r.Body.Close()
		if err != nil {
			http.Error(w, "failed to read request body", http.StatusBadRequest)
			return
		}

		compileStart := time.Now()
		optimizedBody, report, err := p.normalizer.Compile(bodyBytes)
		compileOverhead := time.Since(compileStart)

		if err == nil && len(optimizedBody) > 0 {
			rawBody = optimizedBody
			compileReport = report
			// Set Content-Length header for the optimized payload
			r.Header.Set("Content-Length", fmt.Sprintf("%d", len(optimizedBody)))
		} else {
			rawBody = bodyBytes
		}

		// Attach compilation overhead header
		w.Header().Set("X-PrefixGuard-Overhead-Us", fmt.Sprintf("%d", compileOverhead.Microseconds()))
		if compileReport != nil {
			w.Header().Set("X-PrefixGuard-Hit-Estimate", fmt.Sprintf("%.2f", compileReport.EstimatedHitRate))
			w.Header().Set("X-PrefixGuard-Prefix-Hash", compileReport.OptimizedHash)
		}
	} else if r.Body != nil {
		var err error
		rawBody, err = io.ReadAll(r.Body)
		r.Body.Close()
		if err != nil {
			http.Error(w, "failed to read body", http.StatusBadRequest)
			return
		}
	}

	// Prepare upstream request
	targetURL := *p.upstreamURL
	targetURL.Path = r.URL.Path
	targetURL.RawQuery = r.URL.RawQuery

	upstreamReq, err := http.NewRequestWithContext(r.Context(), r.Method, targetURL.String(), bytes.NewReader(rawBody))
	if err != nil {
		http.Error(w, "failed to create upstream request", http.StatusInternalServerError)
		return
	}

	// Copy original request headers
	for k, vv := range r.Header {
		for _, v := range vv {
			upstreamReq.Header.Add(k, v)
		}
	}
	upstreamReq.Host = p.upstreamURL.Host

	// API key override if specified
	if p.cfg.ApiKeyOverride != "" {
		if p.cfg.Provider == config.ProviderAnthropic {
			upstreamReq.Header.Set("x-api-key", p.cfg.ApiKeyOverride)
		} else {
			upstreamReq.Header.Set("Authorization", "Bearer "+p.cfg.ApiKeyOverride)
		}
	}

	// Execute upstream call
	upstreamResp, err := p.client.Do(upstreamReq)
	if err != nil {
		http.Error(w, fmt.Sprintf("upstream error: %v", err), http.StatusBadGateway)
		return
	}
	defer upstreamResp.Body.Close()

	// Copy upstream response headers
	for k, vv := range upstreamResp.Header {
		for _, v := range vv {
			w.Header().Add(k, v)
		}
	}
	w.WriteHeader(upstreamResp.StatusCode)

	contentType := upstreamResp.Header.Get("Content-Type")
	isStream := strings.Contains(contentType, "text/event-stream")

	var modelName string
	if compileReport != nil {
		var pMap map[string]interface{}
		_ = json.Unmarshal(rawBody, &pMap)
		if m, ok := pMap["model"].(string); ok {
			modelName = m
		}
	}

	teamID := r.Header.Get("X-Team-ID")
	if teamID == "" {
		teamID = r.Header.Get("X-Tenant-ID")
	}
	if teamID == "" {
		teamID = "default"
	}

	projectID := r.Header.Get("X-Project-ID")
	if projectID == "" {
		projectID = "default"
	}

	env := r.Header.Get("X-Environment")
	if env == "" {
		env = "production"
	}

	if isStream {
		usage, forwardErr := p.forwarder.Forward(w, upstreamResp.Body, start)
		if forwardErr != nil {
			return
		}

		if usage != nil && isChatEndpoint {
			if usage.Model != "" {
				modelName = usage.Model
			}
			p.recordTelemetry(reqID, modelName, teamID, projectID, env, compileReport, usage, time.Since(start))
		}
	} else {
		respBytes, _ := io.ReadAll(upstreamResp.Body)
		w.Write(respBytes)

		if isChatEndpoint && upstreamResp.StatusCode == http.StatusOK {
			usage := p.parseNonStreamUsage(respBytes, time.Since(start))
			p.recordTelemetry(reqID, modelName, teamID, projectID, env, compileReport, usage, time.Since(start))
		}
	}
}

func (p *ReverseProxy) parseNonStreamUsage(body []byte, totalDuration time.Duration) *StreamUsage {
	usage := &StreamUsage{
		TotalLatencyMs: int(totalDuration.Milliseconds()),
		TTFTMs:         int(totalDuration.Milliseconds()),
	}

	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return usage
	}

	if m, ok := data["model"].(string); ok {
		usage.Model = m
	}

	if u, ok := data["usage"].(map[string]interface{}); ok {
		p.forwarder.extractUsageFromMap(u, usage)
	}

	return usage
}

func (p *ReverseProxy) recordTelemetry(reqID, model, teamID, projectID, env string, report *compiler.CompilationReport, usage *StreamUsage, duration time.Duration) {
	if model == "" {
		model = "claude-3-5-sonnet"
	}

	rawCost, actualCost, savedUSD := p.ledger.CalculateCost(
		model,
		usage.UncachedTokens,
		usage.CacheReadTokens,
		usage.CacheWriteTokens,
		usage.OutputTokens,
	)

	prefixHash := ""
	wasPadded := false
	bustersCount := 0
	var busters []compiler.DetectedBuster

	if report != nil {
		prefixHash = report.OptimizedHash
		wasPadded = report.WasPadded
		bustersCount = len(report.BustersDetected)
		busters = report.BustersDetected
	}

	rec := finops.RequestRecord{
		ID:               reqID,
		Timestamp:        time.Now(),
		Model:            model,
		Provider:         string(p.cfg.Provider),
		TeamID:           teamID,
		ProjectID:        projectID,
		Environment:      env,
		PrefixHash:       prefixHash,
		UncachedTokens:   usage.UncachedTokens,
		CacheReadTokens:  usage.CacheReadTokens,
		CacheWriteTokens: usage.CacheWriteTokens,
		OutputTokens:     usage.OutputTokens,
		RawCostUSD:       rawCost,
		ActualCostUSD:    actualCost,
		SavedCostUSD:     savedUSD,
		TTFTMs:           usage.TTFTMs,
		LatencyMs:        int(duration.Milliseconds()),
		BustersCount:     bustersCount,
		WasPadded:        wasPadded,
	}

	if err := p.ledger.Record(rec, busters); err != nil {
		fmt.Printf("[prefixguard telemetry error]: %v\n", err)
	}

	// Broadcast live update to React 19 studio via SSE
	if p.hub != nil {
		p.hub.Broadcast("request_intercepted", rec)
		sum, err := p.ledger.GetSummary()
		if err == nil {
			p.hub.Broadcast("finops_update", sum)
		}
	}
}
