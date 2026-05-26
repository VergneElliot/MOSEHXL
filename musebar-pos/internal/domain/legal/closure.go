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

type ClosureService struct {
	journalRepo repository.LegalRepository
	orderRepo   repository.OrderRepository
}

func NewClosureService(journalRepo repository.LegalRepository, orderRepo repository.OrderRepository) *ClosureService {
	return &ClosureService{
		journalRepo: journalRepo,
		orderRepo:   orderRepo,
	}
}

// CreateDailyClosure creates a daily closure bulletin for a specific date
func (s *ClosureService) CreateDailyClosure(ctx context.Context, schemaName, establishmentID string, date time.Time, fondDeCaisse float64) (*models.ClosureBulletin, error) {
	// Set period: start of day to end of day
	startDate := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endDate := time.Date(date.Year(), date.Month(), date.Day(), 23, 59, 59, 999999999, date.Location())

	// Get all orders for the period
	orders, err := s.orderRepo.GetOrdersByPeriod(ctx, schemaName, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get orders: %w", err)
	}

	// Get legal journal entries for the period
	entries, err := s.journalRepo.GetEntries(ctx, schemaName, &startDate, &endDate, nil, 1000, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get journal entries: %w", err)
	}

	// Calculate totals
	var totalAmount, totalVAT, tipTotal, changeTotal float64
	var firstSeq, lastSeq int
	transactionCount := 0
	vatBreakdown := make(map[string]map[string]float64)
	paymentBreakdown := make(map[string]float64)

	// Process journal entries - track min/max sequence properly
	firstSeq = -1 // sentinel
	for _, entry := range entries {
		// Track minimum (first) and maximum (last) sequence numbers
		if firstSeq == -1 || entry.SequenceNumber < firstSeq {
			firstSeq = entry.SequenceNumber
		}
		if entry.SequenceNumber > lastSeq {
			lastSeq = entry.SequenceNumber
		}

		if entry.TransactionType == "SALE" || entry.TransactionType == "REFUND" {
			transactionCount++
			totalAmount += entry.Amount
			totalVAT += entry.VATAmount

			// Payment method breakdown
			paymentBreakdown[entry.PaymentMethod] += entry.Amount
		}
	}
	
	// Handle empty case
	if firstSeq == -1 {
		firstSeq = 0
	}

	// Process orders for VAT breakdown and tips/change.
	// Refunded orders subtract so totals reconcile with the legal journal.
	for _, order := range orders {
		if order.Status != "COMPLETED" && order.Status != "REFUNDED" {
			continue
		}

		// Sign: completed sales add, refunds subtract.
		sign := 1.0
		if order.Status == "REFUNDED" {
			sign = -1.0
		}

		tipTotal += sign * order.Tips
		changeTotal += sign * order.Change

		// Get order items for VAT breakdown
		items, err := s.orderRepo.GetOrderItems(ctx, schemaName, order.ID)
		if err != nil {
			continue
		}

		for _, item := range items {
			vatRateKey := fmt.Sprintf("vat_%.0f", item.TaxRate)
			if vatBreakdown[vatRateKey] == nil {
				vatBreakdown[vatRateKey] = make(map[string]float64)
			}

			// Calculate base amount (HT) and VAT, applying sign
			baseAmount := item.Subtotal - item.TaxAmount
			vatBreakdown[vatRateKey]["amount"] += sign * baseAmount
			vatBreakdown[vatRateKey]["vat"] += sign * item.TaxAmount
			vatBreakdown[vatRateKey]["ttc"] += sign * item.Subtotal
		}
	}

	// Convert maps to JSON strings
	vatJSON, _ := json.Marshal(vatBreakdown)
	paymentJSON, _ := json.Marshal(paymentBreakdown)

	// Generate closure hash
	closureData := fmt.Sprintf("%s|%s|%s|%d|%.4f|%.4f",
		establishmentID, "DAILY", startDate.Format(time.RFC3339), lastSeq, totalAmount, totalVAT)
	hash := crypto.CalculateHash("", startDate, "CLOSURE", totalAmount, closureData)

	// Create bulletin
	bulletin := &models.ClosureBulletin{
		EstablishmentID:         establishmentID,
		ClosureType:             "DAILY",
		PeriodStart:             startDate,
		PeriodEnd:               endDate,
		TotalTransactions:       transactionCount,
		FondDeCaisse:           fondDeCaisse,
		TotalAmount:            totalAmount,
		TotalVAT:               totalVAT,
		VATBreakdown:           string(vatJSON),
		PaymentMethodsBreakdown: string(paymentJSON),
		TipsTotal:              tipTotal,
		ChangeTotal:            changeTotal,
		FirstSequence:          &firstSeq,
		LastSequence:           &lastSeq,
		ClosureHash:            hash,
		IsClosed:               true,
	}

	// Save to database
	if err := s.journalRepo.InsertClosureBulletin(ctx, bulletin); err != nil {
		return nil, fmt.Errorf("failed to save closure bulletin: %w", err)
	}

	return bulletin, nil
}

// GetClosureBulletins retrieves closure bulletins with optional filters
func (s *ClosureService) GetClosureBulletins(ctx context.Context, schemaName, establishmentID string, closureType *string, startDate, endDate *time.Time) ([]models.ClosureBulletin, error) {
	return s.journalRepo.GetClosureBulletins(ctx, establishmentID, closureType, startDate, endDate)
}
