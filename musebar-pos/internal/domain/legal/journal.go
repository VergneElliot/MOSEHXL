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

// RecordSale creates an immutable SALE entry in the legal journal
func (s *JournalService) RecordSale(ctx context.Context, schemaName string, orderID int64, amount, vatAmount float64, paymentMethod string, orderData interface{}, userID *string, registerID string) error {
	// Serialize order data to JSON
	rawData, err := json.Marshal(orderData)
	if err != nil {
		return fmt.Errorf("failed to marshal order data: %w", err)
	}

	// Get the last entry's hash and sequence number (for chain continuity)
	previousHash, err := s.repo.GetLastHash(ctx, schemaName)
	if err != nil {
		return fmt.Errorf("failed to get previous hash: %w", err)
	}

	lastSeq, err := s.repo.GetLastSequenceNumber(ctx, schemaName)
	if err != nil {
		return fmt.Errorf("failed to get last sequence number: %w", err)
	}

	// If this is the first entry, use genesis hash and sequence 0
	sequenceNumber := lastSeq + 1
	if previousHash == "" {
		previousHash = "0000000000000000000000000000000000000000000000000000000000000000"
		sequenceNumber = 0
	}

	// Calculate current hash
	timestamp := time.Now().UTC()
	currentHash := crypto.CalculateHash(
		previousHash,
		timestamp,
		"SALE",
		amount,
		string(rawData),
	)

	// Create entry
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

	// Insert into database (append-only table with DB trigger preventing updates/deletes)
	if err := s.repo.InsertEntry(ctx, schemaName, entry); err != nil {
		return fmt.Errorf("failed to insert journal entry: %w", err)
	}

	return nil
}

// RecordRefund creates an immutable REFUND entry in the legal journal
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
	if previousHash == "" {
		previousHash = "0000000000000000000000000000000000000000000000000000000000000000"
		sequenceNumber = 0
	}

	timestamp := time.Now().UTC()
	currentHash := crypto.CalculateHash(
		previousHash,
		timestamp,
		"REFUND",
		amount,
		string(rawData),
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

// VerifyChainIntegrity verifies the hash chain integrity
// This is critical for NF525/LNE certification
func (s *JournalService) VerifyChainIntegrity(ctx context.Context, schemaName string) (bool, error) {
	entries, err := s.repo.GetAllEntries(ctx, schemaName)
	if err != nil {
		return false, fmt.Errorf("failed to get entries: %w", err)
	}

	if len(entries) == 0 {
		return true, nil // Empty chain is valid
	}

	// Verify first entry (should have genesis hash as previous)
	genesisHash := "0000000000000000000000000000000000000000000000000000000000000000"
	if entries[0].PreviousHash != genesisHash {
		return false, fmt.Errorf("first entry must have genesis hash (all zeros) as previous hash, got: %s", entries[0].PreviousHash)
	}

	// Verify each entry's hash and chain linkage
	for i := 0; i < len(entries); i++ {
		entry := entries[i]

		// Recalculate hash
		expectedHash := crypto.CalculateHash(
			entry.PreviousHash,
			entry.Timestamp,
			entry.TransactionType,
			entry.Amount,
			entry.TransactionData,
		)

		// Verify current hash
		if entry.CurrentHash != expectedHash {
			return false, fmt.Errorf("hash mismatch at sequence %d (entry ID %d): expected %s, got %s",
				entry.SequenceNumber, entry.ID, expectedHash, entry.CurrentHash)
		}

		// Verify chain linkage (except for first entry)
		if i > 0 {
			if entry.PreviousHash != entries[i-1].CurrentHash {
				return false, fmt.Errorf("chain broken between sequence %d and %d (entries %d and %d)",
					entries[i-1].SequenceNumber, entry.SequenceNumber,
					entries[i-1].ID, entry.ID)
			}
		}
	}

	return true, nil
}

// GetEntries retrieves legal journal entries with optional filters
func (s *JournalService) GetEntries(ctx context.Context, schemaName string, startDate, endDate *time.Time, entryType *string, limit, offset int) ([]models.LegalEntry, error) {
	return s.repo.GetEntries(ctx, schemaName, startDate, endDate, entryType, limit, offset)
}
