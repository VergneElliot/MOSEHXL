package legal

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"musebar-pos/internal/models"
	"musebar-pos/internal/pkg/crypto"
	"musebar-pos/internal/repository"
)

type JournalService struct {
	repo repository.LegalRepository
}

func NewJournalService(repo repository.LegalRepository) *JournalService {
	return &JournalService{repo: repo}
}

// RecordSale records a sale transaction in the legal journal
func (s *JournalService) RecordSale(ctx context.Context, schemaName string, orderID int64, amount, vatAmount float64, paymentMethod string, orderData interface{}, userID *string, registerID string) error {
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
	
	// Use the new CalculateEntryHash that matches TypeScript implementation
	currentHash := crypto.CalculateEntryHash(
		previousHash,
		sequenceNumber,
		"SALE",
		&orderID,
		amount,
		vatAmount,
		paymentMethod,
		timestamp,
		registerID,
	)

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

// RecordRefund records a refund transaction in the legal journal
func (s *JournalService) RecordRefund(ctx context.Context, schemaName string, orderID int64, amount, vatAmount float64, paymentMethod string, refundData interface{}, userID *string, registerID string) error {
	rawData, err := json.Marshal(refundData)
	if err != nil {
		return fmt.Errorf("failed to marshal refund data: %w", err)
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
	timestamp := time.Now().UTC()

	currentHash := crypto.CalculateEntryHash(
		previousHash,
		sequenceNumber,
		"REFUND",
		&orderID,
		amount,
		vatAmount,
		paymentMethod,
		timestamp,
		registerID,
	)

	entry := &models.LegalEntry{
		SequenceNumber:  sequenceNumber,
		TransactionType: "REFUND",
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

// VerifyChainIntegrity verifies the integrity of the hash chain
func (s *JournalService) VerifyChainIntegrity(ctx context.Context, schemaName string) (bool, error) {
	entries, err := s.repo.GetAllEntries(ctx, schemaName)
	if err != nil {
		return false, fmt.Errorf("failed to get entries: %w", err)
	}

	if len(entries) == 0 {
		return true, nil
	}

	expectedPreviousHash := "0000000000000000000000000000000000000000000000000000000000000000"

	for _, entry := range entries {
		// Check previous hash continuity
		if entry.PreviousHash != expectedPreviousHash {
			return false, fmt.Errorf("hash chain broken at sequence %d", entry.SequenceNumber)
		}

		// Recalculate hash using the same method as when it was created
		expectedHash := crypto.CalculateEntryHash(
			entry.PreviousHash,
			entry.SequenceNumber,
			entry.TransactionType,
			entry.OrderID,
			entry.Amount,
			entry.VATAmount,
			entry.PaymentMethod,
			entry.Timestamp,
			entry.RegisterID,
		)

		if entry.CurrentHash != expectedHash {
			return false, fmt.Errorf("hash mismatch at sequence %d (entry ID %d): expected %s, got %s",
				entry.SequenceNumber, entry.ID, expectedHash, entry.CurrentHash)
		}

		expectedPreviousHash = entry.CurrentHash
	}

	return true, nil
}

// GetEntries retrieves journal entries with optional filters
func (s *JournalService) GetEntries(ctx context.Context, schemaName string, startDate, endDate *time.Time, transactionType *string, limit, offset int) ([]models.LegalEntry, error) {
	return s.repo.GetEntries(ctx, schemaName, startDate, endDate, transactionType, limit, offset)
}
