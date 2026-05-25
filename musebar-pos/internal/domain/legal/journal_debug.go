package legal

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"musebar-pos/internal/models"
	"musebar-pos/internal/pkg/crypto"
)

// RecordSaleDebug is like RecordSale but with debug output
func (s *JournalService) RecordSaleDebug(ctx context.Context, schemaName string, orderID int64, amount, vatAmount float64, paymentMethod string, orderData interface{}, userID *string, registerID string) error {
	rawData, err := json.Marshal(orderData)
	if err != nil {
		return fmt.Errorf("failed to marshal order data: %w", err)
	}

	previousHash, err := s.repo.GetLastHash(ctx, schemaName)
	if err != nil {
		return fmt.Errorf("failed to get previous hash: %w", err)
	}

	lastSeq, err := s.repo.GetLastSequenceNumber(ctx, schemaName)
	if err != nil {
		return fmt.Errorf("failed to get last sequence number: %w", err)
	}

	sequenceNumber := lastSeq + 1
	if previousHash == "" {
		previousHash = "0000000000000000000000000000000000000000000000000000000000000000"
		sequenceNumber = 0
	}

	timestamp := time.Now().UTC()
	
	fmt.Printf("\n=== DEBUG RecordSale ===\n")
	fmt.Printf("Previous hash: %s\n", previousHash)
	fmt.Printf("Timestamp: %s\n", timestamp.Format(time.RFC3339Nano))
	fmt.Printf("Type: SALE\n")
	fmt.Printf("Amount: %.4f\n", amount)
	fmt.Printf("RawData: %s\n", string(rawData))
	
	currentHash := crypto.CalculateHash(previousHash, timestamp, "SALE", amount, string(rawData))
	
	fmt.Printf("Calculated hash: %s\n", currentHash)
	fmt.Printf("========================\n\n")

	entry := &models.LegalEntry{
		SequenceNumber:  sequenceNumber,
		TransactionType: "SALE",
		OrderID:         &orderID,
		Amount:          amount,
		VATAmount:       vatAmount,
		PaymentMethod:   paymentMethod,
		TransactionData: string(rawData),
		PreviousHash:    previousHash,
		CurrentHash:     currentHash,
		Timestamp:       timestamp,
		UserID:          userID,
		RegisterID:      registerID,
	}

	if err := s.repo.InsertEntry(ctx, schemaName, entry); err != nil {
		return fmt.Errorf("failed to insert journal entry: %w", err)
	}

	return nil
}
