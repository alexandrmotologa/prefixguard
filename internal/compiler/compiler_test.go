package compiler

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/alexandrmotologa/prefixguard/internal/config"
)

func TestBusterDetector(t *testing.T) {
	d := NewBusterDetector()
	prompt := "Today is 2026-11-19T20:15:30Z. You are session sess_9f8a1234bcde. Execute task."

	sanitized, busters := d.ExtractBusters(prompt)

	if len(busters) < 2 {
		t.Fatalf("expected at least 2 busters detected, got %d", len(busters))
	}

	if strings.Contains(sanitized, "2026-11-19T20:15:30Z") {
		t.Errorf("sanitized text still contains raw timestamp")
	}

	if strings.Contains(sanitized, "sess_9f8a1234bcde") {
		t.Errorf("sanitized text still contains raw session ID")
	}

	suffix := FormatBusterSuffix(busters)
	if !strings.Contains(suffix, "sess_9f8a1234bcde") {
		t.Errorf("suffix does not preserve relocated session ID: %s", suffix)
	}
}

func TestToolCanonicalizer(t *testing.T) {
	c := NewToolCanonicalizer()

	rawTools := []interface{}{
		map[string]interface{}{
			"name":        "search_web",
			"description": "Performs web query",
			"input_schema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"query":  map[string]interface{}{"type": "string"},
					"domain": map[string]interface{}{"type": "string"},
				},
				"required": []interface{}{"query", "domain"},
			},
		},
		map[string]interface{}{
			"name":        "execute_code",
			"description": "Runs code safely",
			"input_schema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"lang": map[string]interface{}{"type": "string"},
					"code": map[string]interface{}{"type": "string"},
				},
			},
		},
	}

	canonicalized, err := c.CanonicalizeTools(rawTools)
	if err != nil {
		t.Fatalf("canonicalize tools failed: %v", err)
	}

	// Should sort execute_code first, search_web second
	firstTool := canonicalized[0].(map[string]interface{})
	if firstTool["name"] != "execute_code" {
		t.Errorf("expected first tool to be execute_code, got %v", firstTool["name"])
	}

	secondTool := canonicalized[1].(map[string]interface{})
	if secondTool["name"] != "search_web" {
		t.Errorf("expected second tool to be search_web, got %v", secondTool["name"])
	}
}

func TestBoundaryPadder(t *testing.T) {
	padder := NewBoundaryPadder(1024, 150)

	// Create prompt with ~950 tokens
	subThresholdPrompt := strings.Repeat("Financial prompt analysis guideline. ", 135)

	res := padder.AlignBoundary(subThresholdPrompt)
	if !res.WasPadded {
		t.Fatalf("expected sub-threshold prompt to be padded, got wasPadded=false (orig=%d tokens)", res.OriginalTokens)
	}

	if res.PaddedTokens < 1024 {
		t.Errorf("expected padded tokens >= 1024, got %d", res.PaddedTokens)
	}
}

func TestTopologyNormalizer_EndToEnd(t *testing.T) {
	cfg := config.DefaultConfig()
	cfg.AutoCacheControl = true
	cfg.AutoAlignBoundary = true
	cfg.AutoIsolateBusters = true
	cfg.AutoCanonicalize = true

	normalizer := NewTopologyNormalizer(cfg)

	rawPayload := []byte(`{
		"model": "claude-3-5-sonnet-20241022",
		"system": "You are a financial assistant. Current time: 2026-11-19 20:15:00 UTC. Session: sess_abc12345.",
		"tools": [
			{"name": "fetch_stock", "description": "Fetches stock price"},
			{"name": "analyze_portfolio", "description": "Analyzes risk"}
		],
		"messages": [
			{"role": "user", "content": "What is the valuation of AAPL?"}
		]
	}`)

	optimizedBytes, report, err := normalizer.Compile(rawPayload)
	if err != nil {
		t.Fatalf("compile failed: %v", err)
	}

	if len(report.BustersDetected) == 0 {
		t.Errorf("expected busters detected")
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(optimizedBytes, &parsed); err != nil {
		t.Fatalf("unmarshal optimized output: %v", err)
	}

	// Verify Anthropic structured system prompt with cache_control
	sysArray, ok := parsed["system"].([]interface{})
	if !ok {
		t.Fatalf("expected structured system array, got %T", parsed["system"])
	}
	sysObj := sysArray[0].(map[string]interface{})
	if _, ok := sysObj["cache_control"]; !ok {
		t.Errorf("expected cache_control injected in system prompt")
	}

	// Verify tools sorted
	toolsArray := parsed["tools"].([]interface{})
	firstTool := toolsArray[0].(map[string]interface{})
	if firstTool["name"] != "analyze_portfolio" {
		t.Errorf("expected analyze_portfolio sorted first, got %v", firstTool["name"])
	}

	// Verify user message received relocated buster suffix
	msgs := parsed["messages"].([]interface{})
	userMsg := msgs[0].(map[string]interface{})
	content := userMsg["content"].(string)
	if !strings.Contains(content, "sess_abc12345") {
		t.Errorf("expected session id relocated to user message suffix, got: %s", content)
	}
}
