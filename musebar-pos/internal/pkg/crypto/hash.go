package crypto

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

// CalculateHash generates a SHA-256 hash for legal journal entries (deprecated - use CalculateEntryHash)
func CalculateHash(previousHash string, timestamp time.Time, transactionType string, amount float64, transactionData string) string {
	data := fmt.Sprintf("%s|%s|%.4f|%s",
		timestamp.Format(time.RFC3339Nano),
		transactionType,
		amount,
		transactionData,
	)
	content := fmt.Sprintf("%s|%s", previousHash, data)
	hash := sha256.Sum256([]byte(content))
	return hex.EncodeToString(hash[:])
}

// CalculateEntryHash generates hash for a complete legal journal entry
// This matches the TypeScript implementation exactly
func CalculateEntryHash(
	previousHash string,
	sequenceNumber int,
	transactionType string,
	orderID *int64,
	amount float64,
	vatAmount float64,
	paymentMethod string,
	timestamp time.Time,
	registerID string,
) string {
	// Format amounts with 4 decimal places (matches TypeScript formatDecimalForHash)
	amountStr := fmt.Sprintf("%.4f", amount)
	vatAmountStr := fmt.Sprintf("%.4f", vatAmount)
	
	// Handle null order_id (matches TypeScript: orderId === null ? 'null' : orderId)
	orderIDStr := "null"
	if orderID != nil {
		orderIDStr = fmt.Sprintf("%d", *orderID)
	}
	
	// CRITICAL: Use UTC timestamp with milliseconds in ISO format (toISOString() format)
	// This must match JavaScript's toISOString() which gives: "2026-05-26T13:24:03.123Z"
	timestampStr := timestamp.UTC().Format("2006-01-02T15:04:05.999Z07:00")
	
	// Build data string (matches TypeScript dataString format exactly)
	dataString := fmt.Sprintf("%d|%s|%s|%s|%s|%s|%s|%s",
		sequenceNumber,
		transactionType,
		orderIDStr,
		amountStr,
		vatAmountStr,
		paymentMethod,
		timestampStr,
		registerID,
	)
	
	// Generate hash: previousHash|dataString (matches TypeScript generateHash)
	content := fmt.Sprintf("%s|%s", previousHash, dataString)
	hash := sha256.Sum256([]byte(content))
	return hex.EncodeToString(hash[:])
}
