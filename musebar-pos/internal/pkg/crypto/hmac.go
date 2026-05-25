package crypto

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
)

// SignArchive generates HMAC-SHA256 signature for archive export
// This implements the digital signature required by French law
func SignArchive(data []byte, secretKey string) string {
	h := hmac.New(sha256.New, []byte(secretKey))
	h.Write(data)
	return hex.EncodeToString(h.Sum(nil))
}

// VerifyArchiveSignature verifies HMAC-SHA256 signature
func VerifyArchiveSignature(data []byte, signature string, secretKey string) bool {
	expectedSignature := SignArchive(data, secretKey)
	// Use hmac.Equal to prevent timing attacks
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// GenerateHMAC generates HMAC-SHA256 for any data
func GenerateHMAC(data, key string) string {
	h := hmac.New(sha256.New, []byte(key))
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}
