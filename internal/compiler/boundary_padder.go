package compiler

import (
	"strings"

	"github.com/alexandrmotologa/prefixguard/internal/tokenizer"
)

// InvariantBlock represents a certified semantic rule block that safely expands
// prefix token length without modifying model reasoning or task constraints.
var certifiedInvariants = []string{
	"Strict Execution Invariant: Maintain deterministic formatting, exact schema validation, and adhere to structural outputs without gratuitous commentary.",
	"Reasoning Protocol: Verify all input parameters against formal constraints before executing dependent tool sequences.",
	"Operational Baseline: Ensure consistency across multi-turn state transitions and preserve fidelity of canonical payloads.",
	"Factual Grounding Guard: Base inferences strictly on provided context, avoiding speculative hypotheses unless explicitly requested.",
	"Output Structure Guideline: Format all code snippets, tabular schemas, and structured objects using unambiguous standard representations.",
}

// BoundaryPadder checks if a static prefix falls just below provider thresholds
// and intelligently pads it with certified invariants to activate the prompt cache.
type BoundaryPadder struct {
	TargetThreshold int // e.g. 1024 for Anthropic/OpenAI, 2048 for Opus
	Margin          int // e.g. 150 (if tokens in [874, 1023], pad to 1024)
}

// NewBoundaryPadder creates a padder instance.
func NewBoundaryPadder(targetThreshold int, margin int) *BoundaryPadder {
	if targetThreshold <= 0 {
		targetThreshold = 1024
	}
	if margin <= 0 {
		margin = 150
	}
	return &BoundaryPadder{
		TargetThreshold: targetThreshold,
		Margin:          margin,
	}
}

// PadResult contains details of the padding operation.
type PadResult struct {
	OriginalTokens int
	PaddedTokens   int
	TokensAdded    int
	WasPadded      bool
	PaddedText     string
}

// AlignBoundary evaluates prefix tokens and appends invariants if within the margin.
func (p *BoundaryPadder) AlignBoundary(prefixText string) PadResult {
	currentTokens := tokenizer.EstimateTokens(prefixText)

	// If already meets or exceeds target threshold, no padding needed
	if currentTokens >= p.TargetThreshold {
		return PadResult{
			OriginalTokens: currentTokens,
			PaddedTokens:   currentTokens,
			TokensAdded:    0,
			WasPadded:      false,
			PaddedText:     prefixText,
		}
	}

	// Check if it's within the opportunistic padding window: [TargetThreshold - Margin, TargetThreshold - 1]
	if currentTokens < (p.TargetThreshold - p.Margin) {
		// Too far below threshold to pad without bloating
		return PadResult{
			OriginalTokens: currentTokens,
			PaddedTokens:   currentTokens,
			TokensAdded:    0,
			WasPadded:      false,
			PaddedText:     prefixText,
		}
	}

	// Within padding window: incrementally append certified invariants until target reached
	var sb strings.Builder
	sb.WriteString(prefixText)
	sb.WriteString("\n\n[Cache Optimization Directives:\n")

	accumulatedTokens := currentTokens
	idx := 0

	for accumulatedTokens < p.TargetThreshold+10 && idx < len(certifiedInvariants)*3 {
		invariant := certifiedInvariants[idx%len(certifiedInvariants)]
		sb.WriteString("- ")
		sb.WriteString(invariant)
		sb.WriteString("\n")
		idx++
		accumulatedTokens = tokenizer.EstimateTokens(sb.String())
	}
	sb.WriteString("]")

	paddedText := sb.String()
	finalTokens := tokenizer.EstimateTokens(paddedText)

	return PadResult{
		OriginalTokens: currentTokens,
		PaddedTokens:   finalTokens,
		TokensAdded:    finalTokens - currentTokens,
		WasPadded:      true,
		PaddedText:     paddedText,
	}
}
