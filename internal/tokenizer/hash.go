package tokenizer

import (
	"crypto/sha256"
	"encoding/hex"
	"hash/fnv"
)

// PrefixHash computes a fast 64-bit FNV-1a hash of a static prefix string.
func PrefixHash(prefix string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(prefix))
	return h.Sum64()
}

// PrefixHashHex returns the 64-bit hash as a hexadecimal string.
func PrefixHashHex(prefix string) string {
	h := fnv.New64a()
	h.Write([]byte(prefix))
	return hex.EncodeToString(h.Sum(nil))
}

// PrefixSHA256 returns full 256-bit cryptographic digest for strict prefix verification.
func PrefixSHA256(prefix string) string {
	sum := sha256.Sum256([]byte(prefix))
	return hex.EncodeToString(sum[:])
}
