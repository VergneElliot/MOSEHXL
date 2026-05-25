package main

import (
	"fmt"
	"time"

	"musebar-pos/internal/pkg/crypto"
)

func main() {
	// Data from sequence 0
	previousHash := "0000000000000000000000000000000000000000000000000000000000000000"
	timestamp, _ := time.Parse("2006-01-02 15:04:05.999999-07", "2026-05-25 14:44:50.526422+02")
	transactionType := "SALE"
	amount := 10.0000
	rawData := `{"items": [{"name": "Coffee", "price": 10, "quantity": 1}], "order_id": 1001}`

	// Calculate hash
	calculatedHash := crypto.CalculateHash(previousHash, timestamp, transactionType, amount, rawData)
	storedHash := "d91db414f70dc3d8bffbdfa50741eabc9dda1aea0e60ec6c324cb18bbfb79b05"

	fmt.Println("Calculated hash:", calculatedHash)
	fmt.Println("Stored hash:    ", storedHash)
	fmt.Println("Match:          ", calculatedHash == storedHash)

	// Show what we're hashing
	hashInput := fmt.Sprintf("%s|%s|%s|%.4f|%s",
		previousHash,
		timestamp.Format(time.RFC3339Nano),
		transactionType,
		amount,
		rawData,
	)
	fmt.Println("\nHash input:")
	fmt.Println(hashInput)
}
