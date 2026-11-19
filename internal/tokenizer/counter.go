package tokenizer

import (
	"unicode"
)

// EstimateTokens calculates an estimated token count for text using byte-pair pattern heuristics
// aligned with modern BPE tokenizers (cl100k_base, claude-tokenizer).
// It runs in O(N) time with minimal allocations.
func EstimateTokens(text string) int {
	if len(text) == 0 {
		return 0
	}

	tokens := 0
	inWord := false
	inDigit := false
	inPunct := false

	for i := 0; i < len(text); {
		r := rune(text[i])
		if r > 127 {
			// Multi-byte Unicode: consume full rune
			_, size := decodeRune(text[i:])
			i += size
			tokens += 2
			inWord = false
			inDigit = false
			inPunct = false
			continue
		}

		i++

		switch {
		case unicode.IsSpace(r):
			inWord = false
			inDigit = false
			inPunct = false

		case unicode.IsLetter(r):
			if !inWord || unicode.IsUpper(r) {
				tokens++
				inWord = true
			}
			inDigit = false
			inPunct = false

		case unicode.IsDigit(r):
			if !inDigit {
				tokens++
				inDigit = true
			}
			inWord = false
			inPunct = false

		case unicode.IsPunct(r) || unicode.IsSymbol(r):
			if !inPunct {
				tokens++
				inPunct = true
			}
			inWord = false
			inDigit = false

		default:
			tokens++
			inWord = false
			inDigit = false
			inPunct = false
		}
	}

	if tokens == 0 && len(text) > 0 {
		return 1
	}

	charBasedEstimate := (len(text) + 3) / 4
	if tokens < charBasedEstimate*8/10 {
		tokens = (tokens + charBasedEstimate) / 2
	}

	return tokens
}

func decodeRune(s string) (rune, int) {
	b0 := s[0]
	if b0 < 0x80 {
		return rune(b0), 1
	}
	if b0 < 0xE0 && len(s) >= 2 {
		return rune(b0&0x1F)<<6 | rune(s[1]&0x3F), 2
	}
	if b0 < 0xF0 && len(s) >= 3 {
		return rune(b0&0x0F)<<12 | rune(s[1]&0x3F)<<6 | rune(s[2]&0x3F), 3
	}
	if len(s) >= 4 {
		return rune(b0&0x07)<<18 | rune(s[1]&0x3F)<<12 | rune(s[2]&0x3F)<<6 | rune(s[3]&0x3F), 4
	}
	return rune(b0), 1
}
