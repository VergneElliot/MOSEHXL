package main

import (
	"context"
	"fmt"
	"time"

	"musebar-pos/internal/config"
	"musebar-pos/internal/pkg/crypto"
)

func main() {
	cfg, _ := config.Load()
	db, _ := config.InitDB(cfg)
	defer db.Close()

	ctx := context.Background()

	// Get the actual entry from database
	var (
		id              int64
		sequenceNumber  int
		transactionType string
		orderID         *int64
		amount          float64
		vatAmount       float64
		paymentMethod   string
		timestamp       time.Time
		registerID      string
		previousHash    string
		currentHash     string
	)

	query := `SELECT id, sequence_number, transaction_type, order_id, amount, vat_amount, 
	                 payment_method, timestamp, register_id, previous_hash, current_hash
	          FROM establishment_test_001.legal_journal 
	          WHERE sequence_number = 0`

	err := db.QueryRow(ctx, query).Scan(
		&id, &sequenceNumber, &transactionType, &orderID, &amount, &vatAmount,
		&paymentMethod, &timestamp, &registerID, &previousHash, &currentHash,
	)

	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	fmt.Println("=== DATABASE VALUES ===")
	fmt.Printf("Sequence: %d\n", sequenceNumber)
	fmt.Printf("Type: %s\n", transactionType)
	fmt.Printf("OrderID: %v\n", orderID)
	fmt.Printf("Amount: %.4f\n", amount)
	fmt.Printf("VatAmount: %.4f\n", vatAmount)
	fmt.Printf("Payment: %s\n", paymentMethod)
	fmt.Printf("Timestamp: %s\n", timestamp.Format(time.RFC3339))
	fmt.Printf("RegisterID: %s\n", registerID)
	fmt.Printf("PreviousHash: %s\n", previousHash)
	fmt.Printf("StoredHash: %s\n", currentHash)

	fmt.Println("\n=== RECALCULATION ===")
	recalculated := crypto.CalculateEntryHash(
		previousHash,
		sequenceNumber,
		transactionType,
		orderID,
		amount,
		vatAmount,
		paymentMethod,
		timestamp,
		registerID,
	)
	fmt.Printf("RecalculatedHash: %s\n", recalculated)
	fmt.Printf("Match: %v\n", recalculated == currentHash)

	// Show what we're actually hashing
	orderIDStr := "null"
	if orderID != nil {
		orderIDStr = fmt.Sprintf("%d", *orderID)
	}
	
	dataString := fmt.Sprintf("%d|%s|%s|%.4f|%.4f|%s|%s|%s",
		sequenceNumber,
		transactionType,
		orderIDStr,
		amount,
		vatAmount,
		paymentMethod,
		timestamp.Format(time.RFC3339),
		registerID,
	)
	
	content := fmt.Sprintf("%s|%s", previousHash, dataString)
	
	fmt.Println("\n=== HASH INPUT ===")
	fmt.Printf("DataString: %s\n", dataString)
	fmt.Printf("FullContent: %s\n", content)
}
