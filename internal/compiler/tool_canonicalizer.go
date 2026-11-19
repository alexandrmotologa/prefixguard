package compiler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sort"
)

// ToolDefinition represents a generic tool structure compatible with Anthropic and OpenAI.
type ToolDefinition struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	InputSchema map[string]interface{} `json:"input_schema,omitempty"` // Anthropic
	Parameters  map[string]interface{} `json:"parameters,omitempty"`   // OpenAI
	Type        string                 `json:"type,omitempty"`
}

// ToolCanonicalizer enforces deterministic ordering and minification of tool schemas.
type ToolCanonicalizer struct{}

// NewToolCanonicalizer creates a new canonicalizer.
func NewToolCanonicalizer() *ToolCanonicalizer {
	return &ToolCanonicalizer{}
}

// CanonicalizeTools sorts tools alphabetically by name and recursively sorts schema keys.
func (c *ToolCanonicalizer) CanonicalizeTools(rawTools []interface{}) ([]interface{}, error) {
	if len(rawTools) == 0 {
		return rawTools, nil
	}

	canonicalized := make([]map[string]interface{}, 0, len(rawTools))

	for _, item := range rawTools {
		var toolMap map[string]interface{}
		switch v := item.(type) {
		case map[string]interface{}:
			toolMap = v
		default:
			// Marshal and unmarshal to convert struct to map
			data, err := json.Marshal(v)
			if err != nil {
				return nil, fmt.Errorf("marshal tool: %w", err)
			}
			if err := json.Unmarshal(data, &toolMap); err != nil {
				return nil, fmt.Errorf("unmarshal tool: %w", err)
			}
		}

		cleanMap := c.canonicalizeMap(toolMap)
		canonicalized = append(canonicalized, cleanMap)
	}

	// Stably sort tools by name
	sort.SliceStable(canonicalized, func(i, j int) bool {
		nameI := extractToolName(canonicalized[i])
		nameJ := extractToolName(canonicalized[j])
		return nameI < nameJ
	})

	result := make([]interface{}, len(canonicalized))
	for i, v := range canonicalized {
		result[i] = v
	}

	return result, nil
}

// CanonicalizeToBytes takes any tool list and emits deterministically sorted minified JSON bytes.
func (c *ToolCanonicalizer) CanonicalizeToBytes(rawTools []interface{}) ([]byte, error) {
	tools, err := c.CanonicalizeTools(rawTools)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(tools); err != nil {
		return nil, err
	}
	// Trim trailing newline added by Encoder
	return bytes.TrimSpace(buf.Bytes()), nil
}

func extractToolName(tool map[string]interface{}) string {
	if name, ok := tool["name"].(string); ok {
		return name
	}
	// OpenAI function call schema: {"type": "function", "function": {"name": "..."}}
	if fn, ok := tool["function"].(map[string]interface{}); ok {
		if name, ok := fn["name"].(string); ok {
			return name
		}
	}
	return ""
}

// canonicalizeMap recursively ensures all sub-maps and slices are deterministically structured.
func (c *ToolCanonicalizer) canonicalizeMap(m map[string]interface{}) map[string]interface{} {
	clean := make(map[string]interface{}, len(m))
	for k, v := range m {
		clean[k] = c.canonicalizeValue(v)
	}
	return clean
}

func (c *ToolCanonicalizer) canonicalizeValue(v interface{}) interface{} {
	switch val := v.(type) {
	case map[string]interface{}:
		return c.canonicalizeMap(val)
	case []interface{}:
		cleanSlice := make([]interface{}, len(val))
		for i, elem := range val {
			cleanSlice[i] = c.canonicalizeValue(elem)
		}
		// If slice contains strings, sort them for stable schemas (e.g. "required": ["b", "a"] -> ["a", "b"])
		if isStringSlice(cleanSlice) {
			sort.Slice(cleanSlice, func(i, j int) bool {
				return cleanSlice[i].(string) < cleanSlice[j].(string)
			})
		}
		return cleanSlice
	default:
		return val
	}
}

func isStringSlice(s []interface{}) bool {
	if len(s) == 0 {
		return false
	}
	for _, v := range s {
		if _, ok := v.(string); !ok {
			return false
		}
	}
	return true
}
