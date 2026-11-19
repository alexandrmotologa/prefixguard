package compiler

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/alexandrmotologa/prefixguard/internal/config"
)

// BusterType classifies the type of volatile dynamic token detected.
type BusterType string

const (
	BusterTimestamp BusterType = "timestamp"
	BusterUUID      BusterType = "uuid"
	BusterSessionID BusterType = "session_id"
	BusterNonce     BusterType = "nonce"
	BusterIPAddress BusterType = "ip_address"
	BusterCustom    BusterType = "custom"
)

// DetectedBuster records a single identified cache-busting token sequence.
type DetectedBuster struct {
	Type        BusterType `json:"type"`
	Value       string     `json:"value"`
	Placeholder string     `json:"placeholder"`
	OriginalKey string     `json:"original_key,omitempty"`
}

type compiledCustomRule struct {
	Name        string
	Regex       *regexp.Regexp
	Placeholder string
}

var (
	// ISO8601 / RFC3339 timestamps e.g. 2026-11-19T20:15:30Z or 2026-11-19 20:15:30
	isoTimestampRegex = regexp.MustCompile(`(?i)(?:current\s+time|timestamp|today\s+is|datetime|date)?:?\s*(\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b)`)
	// Natural date e.g. "November 19, 2026" or "19 November 2026"
	naturalDateRegex = regexp.MustCompile(`(?i)(?:current\s+date|today\s+is)?:?\s*(\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))\s+\d{1,2},?\s+\d{4}\b)`)
	// UUID v4
	uuidRegex = regexp.MustCompile(`(?i)\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b`)
	// Session / Conversation identifiers e.g. sess_abc12345, conv_98765432
	sessionIDRegex = regexp.MustCompile(`(?i)\b(?:sess|session|conv|conversation|trace|req|request)[-_][a-zA-Z0-9]{8,64}\b`)
	// Nonce / high entropy hex tokens (32 or 64 hex characters)
	nonceHexRegex = regexp.MustCompile(`(?i)(?:nonce|token|seed)[:=\s]+([0-9a-f]{32,64})\b`)
	// IPv4 address
	ipAddressRegex = regexp.MustCompile(`\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b`)
)

// BusterDetector isolates and extracts cache-invalidating dynamic parameters.
type BusterDetector struct {
	customRules []compiledCustomRule
}

// NewBusterDetector instantiates a new detector with optional custom rules.
func NewBusterDetector(customRules ...config.CustomBusterRule) *BusterDetector {
	var compiled []compiledCustomRule
	for _, r := range customRules {
		if re, err := regexp.Compile(r.Pattern); err == nil {
			compiled = append(compiled, compiledCustomRule{
				Name:        r.Name,
				Regex:       re,
				Placeholder: r.Placeholder,
			})
		}
	}
	return &BusterDetector{customRules: compiled}
}

// ExtractBusters inspects text and returns discovered busters along with an invariant text version.
func (d *BusterDetector) ExtractBusters(input string) (string, []DetectedBuster) {
	var busters []DetectedBuster
	output := input

	// 0. Custom Domain Rules
	for _, rule := range d.customRules {
		output = rule.Regex.ReplaceAllStringFunc(output, func(match string) string {
			busters = append(busters, DetectedBuster{
				Type:        BusterType(rule.Name),
				Value:       match,
				Placeholder: rule.Placeholder,
			})
			return rule.Placeholder
		})
	}

	// 1. Session IDs
	output = sessionIDRegex.ReplaceAllStringFunc(output, func(match string) string {
		busters = append(busters, DetectedBuster{
			Type:        BusterSessionID,
			Value:       match,
			Placeholder: "[DYNAMIC_SESSION_ID]",
		})
		return "[DYNAMIC_SESSION_ID]"
	})

	// 2. Timestamps ISO
	output = isoTimestampRegex.ReplaceAllStringFunc(output, func(match string) string {
		sub := isoTimestampRegex.FindStringSubmatch(match)
		val := match
		if len(sub) > 1 && len(sub[1]) > 0 {
			val = sub[1]
		}
		busters = append(busters, DetectedBuster{
			Type:        BusterTimestamp,
			Value:       val,
			Placeholder: "[DYNAMIC_TIMESTAMP_UTC]",
		})
		return strings.Replace(match, val, "[DYNAMIC_TIMESTAMP_UTC]", 1)
	})

	// 3. Natural dates
	output = naturalDateRegex.ReplaceAllStringFunc(output, func(match string) string {
		sub := naturalDateRegex.FindStringSubmatch(match)
		val := match
		if len(sub) > 1 && len(sub[1]) > 0 {
			val = sub[1]
		}
		busters = append(busters, DetectedBuster{
			Type:        BusterTimestamp,
			Value:       val,
			Placeholder: "[DYNAMIC_DATE]",
		})
		return strings.Replace(match, val, "[DYNAMIC_DATE]", 1)
	})

	// 4. UUIDs
	output = uuidRegex.ReplaceAllStringFunc(output, func(match string) string {
		busters = append(busters, DetectedBuster{
			Type:        BusterUUID,
			Value:       match,
			Placeholder: "[DYNAMIC_UUID]",
		})
		return "[DYNAMIC_UUID]"
	})

	// 5. Nonce / High-entropy tokens
	output = nonceHexRegex.ReplaceAllStringFunc(output, func(match string) string {
		sub := nonceHexRegex.FindStringSubmatch(match)
		val := match
		if len(sub) > 1 && len(sub[1]) > 0 {
			val = sub[1]
		}
		busters = append(busters, DetectedBuster{
			Type:        BusterNonce,
			Value:       val,
			Placeholder: "[DYNAMIC_NONCE]",
		})
		return strings.Replace(match, val, "[DYNAMIC_NONCE]", 1)
	})

	// 6. IP Addresses
	output = ipAddressRegex.ReplaceAllStringFunc(output, func(match string) string {
		busters = append(busters, DetectedBuster{
			Type:        BusterIPAddress,
			Value:       match,
			Placeholder: "[DYNAMIC_CLIENT_IP]",
		})
		return "[DYNAMIC_CLIENT_IP]"
	})

	return output, busters
}

// FormatBusterSuffix serializes extracted buster values into a compact suffix block.
func FormatBusterSuffix(busters []DetectedBuster) string {
	if len(busters) == 0 {
		return ""
	}
	var sb strings.Builder
	sb.WriteString("\n\n[Runtime Context Suffix:\n")
	seen := make(map[string]bool)
	for _, b := range busters {
		entry := fmt.Sprintf("- %s: %s", b.Type, b.Value)
		if !seen[entry] {
			seen[entry] = true
			sb.WriteString(entry)
			sb.WriteString("\n")
		}
	}
	sb.WriteString("]")
	return sb.String()
}
