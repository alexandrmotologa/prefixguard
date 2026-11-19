package proxy

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// StreamUsage records parsed token metrics and timings from an SSE stream.
type StreamUsage struct {
	UncachedTokens   int
	CacheReadTokens  int
	CacheWriteTokens int
	OutputTokens     int
	TTFTMs           int
	TotalLatencyMs   int
	Model            string
}

// SSEForwarder streams chunks to the downstream client with zero buffering delay
// while inspecting usage blocks in real time.
type SSEForwarder struct{}

// NewSSEForwarder creates a new forwarder.
func NewSSEForwarder() *SSEForwarder {
	return &SSEForwarder{}
}

// Forward copies SSE events from upstream to client writer, measuring TTFT and capturing usage.
func (f *SSEForwarder) Forward(w http.ResponseWriter, upstreamBody io.ReadCloser, startTime time.Time) (*StreamUsage, error) {
	defer upstreamBody.Close()

	flusher, ok := w.(http.Flusher)
	if !ok {
		return nil, fmt.Errorf("response writer does not support flushing")
	}

	reader := bufio.NewReader(upstreamBody)
	usage := &StreamUsage{}
	firstTokenSeen := false

	for {
		line, err := reader.ReadBytes('\n')
		if len(line) > 0 {
			if !firstTokenSeen && bytes.Contains(line, []byte("data:")) {
				firstTokenSeen = true
				usage.TTFTMs = int(time.Since(startTime).Milliseconds())
			}

			// Forward line directly to client without delay
			if _, writeErr := w.Write(line); writeErr != nil {
				return usage, fmt.Errorf("write to client: %w", writeErr)
			}
			flusher.Flush()

			// Inspect line for usage payload
			f.parseSSELine(line, usage)
		}

		if err != nil {
			if err == io.EOF {
				break
			}
			return usage, fmt.Errorf("read upstream stream: %w", err)
		}
	}

	usage.TotalLatencyMs = int(time.Since(startTime).Milliseconds())
	if usage.TTFTMs == 0 {
		usage.TTFTMs = usage.TotalLatencyMs
	}

	return usage, nil
}

func (f *SSEForwarder) parseSSELine(line []byte, usage *StreamUsage) {
	trimmed := bytes.TrimSpace(line)
	if !bytes.HasPrefix(trimmed, []byte("data:")) {
		return
	}

	payload := bytes.TrimSpace(bytes.TrimPrefix(trimmed, []byte("data:")))
	if len(payload) == 0 || bytes.Equal(payload, []byte("[DONE]")) {
		return
	}

	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return
	}

	// 1. Anthropic message_start event
	if msgType, ok := data["type"].(string); ok && msgType == "message_start" {
		if msg, ok := data["message"].(map[string]interface{}); ok {
			if mName, ok := msg["model"].(string); ok && usage.Model == "" {
				usage.Model = mName
			}
			if u, ok := msg["usage"].(map[string]interface{}); ok {
				f.extractUsageFromMap(u, usage)
			}
		}
	}

	// 2. Anthropic message_delta event
	if msgType, ok := data["type"].(string); ok && msgType == "message_delta" {
		if u, ok := data["usage"].(map[string]interface{}); ok {
			if out, ok := u["output_tokens"].(float64); ok && out > 0 {
				usage.OutputTokens = int(out)
			}
		}
	}

	// 3. OpenAI / DeepSeek chunk usage block
	if u, ok := data["usage"].(map[string]interface{}); ok {
		f.extractUsageFromMap(u, usage)
	}

	// OpenAI model in chunk
	if mName, ok := data["model"].(string); ok && usage.Model == "" {
		usage.Model = mName
	}
}

func (f *SSEForwarder) extractUsageFromMap(u map[string]interface{}, usage *StreamUsage) {
	// Anthropic usage keys
	if cr, ok := u["cache_read_input_tokens"].(float64); ok {
		usage.CacheReadTokens = int(cr)
	}
	if cw, ok := u["cache_creation_input_tokens"].(float64); ok {
		usage.CacheWriteTokens = int(cw)
	}
	if in, ok := u["input_tokens"].(float64); ok {
		usage.UncachedTokens = int(in)
	}
	if out, ok := u["output_tokens"].(float64); ok && usage.OutputTokens == 0 {
		usage.OutputTokens = int(out)
	}

	// OpenAI prompt_tokens_details
	if ptd, ok := u["prompt_tokens_details"].(map[string]interface{}); ok {
		if cached, ok := ptd["cached_tokens"].(float64); ok {
			usage.CacheReadTokens = int(cached)
		}
	}

	// OpenAI / DeepSeek total prompt tokens
	if pt, ok := u["prompt_tokens"].(float64); ok {
		totalPrompt := int(pt)
		if usage.CacheReadTokens > 0 {
			usage.UncachedTokens = totalPrompt - usage.CacheReadTokens
			if usage.UncachedTokens < 0 {
				usage.UncachedTokens = 0
			}
		} else {
			usage.UncachedTokens = totalPrompt
		}
	}

	// DeepSeek specific keys
	if hit, ok := u["prompt_cache_hit_tokens"].(float64); ok {
		usage.CacheReadTokens = int(hit)
	}
	if miss, ok := u["prompt_cache_miss_tokens"].(float64); ok {
		usage.UncachedTokens = int(miss)
	}
	if comp, ok := u["completion_tokens"].(float64); ok {
		usage.OutputTokens = int(comp)
	}
}
