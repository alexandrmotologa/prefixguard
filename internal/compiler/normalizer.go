package compiler

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/alexandrmotologa/prefixguard/internal/config"
	"github.com/alexandrmotologa/prefixguard/internal/tokenizer"
)

// CompilationReport captures telemetry and diff metrics from the compilation pass.
type CompilationReport struct {
	OriginalTokens   int              `json:"original_tokens"`
	OptimizedTokens  int              `json:"optimized_tokens"`
	StaticTokens     int              `json:"static_tokens"`
	DynamicTokens    int              `json:"dynamic_tokens"`
	OriginalHash     string           `json:"original_hash"`
	OptimizedHash    string           `json:"optimized_hash"`
	BustersDetected  []DetectedBuster `json:"busters_detected"`
	ToolsSorted      int              `json:"tools_sorted"`
	WasPadded        bool             `json:"was_padded"`
	PaddingAdded     int              `json:"padding_added"`
	CacheControlSet  bool             `json:"cache_control_set"`
	BreakpointsCount int              `json:"breakpoints_count"`
	EstimatedHitRate float64          `json:"estimated_hit_rate"`
}

// TopologyNormalizer orchestrates prompt reorganization, variable extraction, and token boundary alignment.
type TopologyNormalizer struct {
	cfg           config.Config
	detector      *BusterDetector
	canonicalizer *ToolCanonicalizer
	padder        *BoundaryPadder
}

// NewTopologyNormalizer initializes the normalizer with given settings.
func NewTopologyNormalizer(cfg config.Config) *TopologyNormalizer {
	threshold := cfg.MinCacheThreshold
	if threshold <= 0 {
		threshold = 1024
	}
	margin := cfg.PaddingMargin
	if margin <= 0 {
		margin = 150
	}
	return &TopologyNormalizer{
		cfg:           cfg,
		detector:      NewBusterDetector(cfg.CustomBusters...),
		canonicalizer: NewToolCanonicalizer(),
		padder:        NewBoundaryPadder(threshold, margin),
	}
}

// Compile processes an incoming request body and produces a cache-optimized version.
func (n *TopologyNormalizer) Compile(rawBody []byte) ([]byte, *CompilationReport, error) {
	var payload map[string]interface{}
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		return nil, nil, fmt.Errorf("unmarshal request payload: %w", err)
	}

	report := &CompilationReport{
		BustersDetected: make([]DetectedBuster, 0),
	}

	rawString := string(rawBody)
	report.OriginalTokens = tokenizer.EstimateTokens(rawString)
	report.OriginalHash = tokenizer.PrefixHashHex(rawString)

	var staticPrefixBuilder strings.Builder
	breakpointsUsed := 0
	const maxBreakpoints = 4

	isAnthropic := n.cfg.Provider == config.ProviderAnthropic || strings.Contains(strings.ToLower(fmt.Sprint(payload["model"])), "claude")

	// 1. Process System Prompt (Tier 1 Breakpoint)
	hasAnthropicSystem := false
	if sysVal, exists := payload["system"]; exists {
		hasAnthropicSystem = true
		sysText := extractSystemText(sysVal)

		if n.cfg.AutoIsolateBusters {
			cleanSys, busters := n.detector.ExtractBusters(sysText)
			sysText = cleanSys
			report.BustersDetected = append(report.BustersDetected, busters...)
		}

		if n.cfg.AutoAlignBoundary {
			padRes := n.padder.AlignBoundary(sysText)
			if padRes.WasPadded {
				sysText = padRes.PaddedText
				report.WasPadded = true
				report.PaddingAdded = padRes.TokensAdded
			}
		}

		staticPrefixBuilder.WriteString(sysText)

		if n.cfg.AutoCacheControl && isAnthropic && breakpointsUsed < maxBreakpoints {
			payload["system"] = []map[string]interface{}{
				{
					"type": "text",
					"text": sysText,
					"cache_control": map[string]string{
						"type": "ephemeral",
					},
				},
			}
			report.CacheControlSet = true
			breakpointsUsed++
		} else {
			payload["system"] = sysText
		}
	}

	// 2. Canonicalize Tools (Tier 2 Breakpoint)
	if toolsRaw, exists := payload["tools"]; exists {
		if toolsSlice, ok := toolsRaw.([]interface{}); ok && len(toolsSlice) > 0 {
			if n.cfg.AutoCanonicalize {
				cleanTools, err := n.canonicalizer.CanonicalizeTools(toolsSlice)
				if err == nil {
					payload["tools"] = cleanTools
					report.ToolsSorted = len(cleanTools)
					toolBytes, _ := json.Marshal(cleanTools)
					staticPrefixBuilder.Write(toolBytes)

					if n.cfg.AutoCacheControl && isAnthropic && breakpointsUsed < maxBreakpoints {
						if len(cleanTools) > 0 {
							if lastTool, ok := cleanTools[len(cleanTools)-1].(map[string]interface{}); ok {
								lastTool["cache_control"] = map[string]string{"type": "ephemeral"}
								report.CacheControlSet = true
								breakpointsUsed++
							}
						}
					}
				}
			}
		}
	}

	// 3. Process Messages (Tier 3 & 4 Breakpoints)
	if msgsRaw, exists := payload["messages"]; exists {
		if msgsSlice, ok := msgsRaw.([]interface{}); ok && len(msgsSlice) > 0 {
			var newMsgs []interface{}
			lastIdx := len(msgsSlice) - 1

			for i, m := range msgsSlice {
				msgMap, ok := m.(map[string]interface{})
				if !ok {
					newMsgs = append(newMsgs, m)
					continue
				}

				role, _ := msgMap["role"].(string)

				// OpenAI system message inside messages array
				if !hasAnthropicSystem && role == "system" {
					content, _ := msgMap["content"].(string)
					if n.cfg.AutoIsolateBusters {
						cleanContent, busters := n.detector.ExtractBusters(content)
						content = cleanContent
						report.BustersDetected = append(report.BustersDetected, busters...)
					}
					if n.cfg.AutoAlignBoundary {
						padRes := n.padder.AlignBoundary(content)
						if padRes.WasPadded {
							content = padRes.PaddedText
							report.WasPadded = true
							report.PaddingAdded = padRes.TokensAdded
						}
					}
					msgMap["content"] = content
					staticPrefixBuilder.WriteString(content)
					newMsgs = append(newMsgs, msgMap)
					continue
				}

				// If earlier turns (few-shot or chat history)
				if i < lastIdx {
					contentStr := fmt.Sprint(msgMap["content"])
					if n.cfg.AutoIsolateBusters {
						cleanContent, busters := n.detector.ExtractBusters(contentStr)
						msgMap["content"] = cleanContent
						report.BustersDetected = append(report.BustersDetected, busters...)
						staticPrefixBuilder.WriteString(cleanContent)
					} else {
						staticPrefixBuilder.WriteString(contentStr)
					}

					// Multi-Tier Breakpoint: If this earlier message has substantial token weight (> 1024t)
					// or is the last message before the latest user turn, place an ephemeral breakpoint!
					if n.cfg.AutoCacheControl && isAnthropic && breakpointsUsed < maxBreakpoints {
						if i == lastIdx-1 || tokenizer.EstimateTokens(contentStr) >= 1024 {
							msgMap = injectMessageCacheControl(msgMap)
							breakpointsUsed++
						}
					}

					newMsgs = append(newMsgs, msgMap)
					continue
				}

				// Trailing turn (current user input): inject extracted dynamic busters here
				if i == lastIdx && len(report.BustersDetected) > 0 {
					suffix := FormatBusterSuffix(report.BustersDetected)
					switch content := msgMap["content"].(type) {
					case string:
						msgMap["content"] = content + suffix
					case []interface{}:
						msgMap["content"] = append(content, map[string]interface{}{
							"type": "text",
							"text": suffix,
						})
					default:
						msgMap["content"] = fmt.Sprint(content) + suffix
					}
				}

				newMsgs = append(newMsgs, msgMap)
			}
			payload["messages"] = newMsgs
		}
	}

	report.BreakpointsCount = breakpointsUsed

	// 4. Calculate Final Optimized Metrics
	optimizedBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, nil, fmt.Errorf("marshal optimized payload: %w", err)
	}

	staticPrefix := staticPrefixBuilder.String()
	report.StaticTokens = tokenizer.EstimateTokens(staticPrefix)
	report.OptimizedTokens = tokenizer.EstimateTokens(string(optimizedBytes))
	report.DynamicTokens = report.OptimizedTokens - report.StaticTokens
	if report.DynamicTokens < 0 {
		report.DynamicTokens = 0
	}
	report.OptimizedHash = tokenizer.PrefixHashHex(staticPrefix)

	if report.StaticTokens >= n.cfg.MinCacheThreshold {
		report.EstimatedHitRate = float64(report.StaticTokens) / float64(report.OptimizedTokens)
		if report.EstimatedHitRate > 0.95 {
			report.EstimatedHitRate = 0.95
		}
	} else {
		report.EstimatedHitRate = 0.15
	}

	return optimizedBytes, report, nil
}

func injectMessageCacheControl(msgMap map[string]interface{}) map[string]interface{} {
	switch c := msgMap["content"].(type) {
	case string:
		msgMap["content"] = []map[string]interface{}{
			{
				"type": "text",
				"text": c,
				"cache_control": map[string]string{
					"type": "ephemeral",
				},
			},
		}
	case []interface{}:
		if len(c) > 0 {
			if lastBlock, ok := c[len(c)-1].(map[string]interface{}); ok {
				lastBlock["cache_control"] = map[string]string{"type": "ephemeral"}
			}
		}
	}
	return msgMap
}

func extractSystemText(v interface{}) string {
	switch val := v.(type) {
	case string:
		return val
	case []interface{}:
		var sb strings.Builder
		for _, item := range val {
			if m, ok := item.(map[string]interface{}); ok {
				if t, ok := m["text"].(string); ok {
					sb.WriteString(t)
					sb.WriteString("\n")
				}
			}
		}
		return strings.TrimSpace(sb.String())
	default:
		return fmt.Sprint(v)
	}
}
