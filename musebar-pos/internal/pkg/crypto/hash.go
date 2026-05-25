package crypto

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

// CalculateHash generates SHA-256 hash for legal journal entry
// This implements the immutable hash chain required by French law
func CalculateHash(previousHash string, timestamp time.Time, entryType string, amount float64, rawData string) string {
	// Format: previousHash|timestamp|type|amount|rawData
	// This ensures any modification breaks the chain
	data := fmt.Sprintf("%s|%s|%s|%.4f|%s",
		previousHash,
		timestamp.Format(time.RFC3339Nano), // High precision timestamp
		entryType,
		amount,
		rawData,
	)

	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// CalculateFileHash generates SHA-256 hash of file content
func CalculateFileHash(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

// VerifyHash verifies if a hash matches the expected value
func VerifyHash(data string, expectedHash string) bool {
	hash := sha256.Sum256([]byte(data))
	actualHash := hex.EncodeToString(hash[:])
	return actualHash == expectedHash
}
