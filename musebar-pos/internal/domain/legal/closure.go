package legal

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
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

// roundTo4 rounds a float to 4 decimal places
func roundTo4(amount float64) float64 {
	return math.Round(amount*10000) / 10000
}

// vatFromTTC extracts VAT from TTC amount using reverse calculation
// 10% => VAT = TTC / 11 ; 20% => VAT = TTC / 6
func vatFromTTC(ttc float64, rate float64) float64 {
	if rate <= 0.15 || (rate >= 9 && rate <= 11) {
		return roundTo4(ttc / 11) // 10% VAT
	}
	return roundTo4(ttc / 6) // 20% VAT
}

// ReconciliationResult compares closure totals with legal journal
type ReconciliationResult struct {
	OK      bool                   `json:"ok"`
	Details map[string]interface{} `json:"details"`
}

func computeReconciliation(
	closureTransactions int, closureAmount, closureVAT float64,
	journalCount int, journalAmount, journalVAT float64,
) ReconciliationResult {
	txDelta := closureTransactions - journalCount
	amountDelta := roundTo4(closureAmount - journalAmount)
	vatDelta := roundTo4(closureVAT - journalVAT)
	ok := txDelta == 0 && math.Abs(amountDelta) < 0.0001 && math.Abs(vatDelta) < 0.0001

	return ReconciliationResult{
		OK: ok,
		Details: map[string]interface{}{
			"closure_transactions":    closureTransactions,
			"journal_transactions":    journalCount,
			"transaction_delta":       txDelta,
			"closure_total_amount":    roundTo4(closureAmount),
			"journal_total_amount":    roundTo4(journalAmount),
			"amount_delta":            amountDelta,
			"closure_total_vat":       roundTo4(closureVAT),
			"journal_total_vat":       roundTo4(journalVAT),
			"vat_delta":               vatDelta,
			"compared_at":             time.Now().UTC().Format(time.RFC3339),
		},
	}
}

// CreateDailyClosure creates a daily closure bulletin
func (s *ClosureService) CreateDailyClosure(ctx context.Context, schemaName, establishmentID string, date time.Time, fondDeCaisse float64) (*models.ClosureBulletin, error) {
	startDate := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endDate := time.Date(date.Year(), date.Month(), date.Day(), 23, 59, 59, 999999999, date.Location())
	return s.createPeriodClosure(ctx, schemaName, establishmentID, "DAILY", startDate, endDate, fondDeCaisse)
}

// CreateMonthlyClosure creates a monthly closure bulletin
func (s *ClosureService) CreateMonthlyClosure(ctx context.Context, schemaName, establishmentID string, year int, month time.Month, fondDeCaisse float64) (*models.ClosureBulletin, error) {
	startDate := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(year, month+1, 1, 0, 0, 0, 0, time.UTC).Add(-time.Nanosecond)
	return s.createPeriodClosure(ctx, schemaName, establishmentID, "MONTHLY", startDate, endDate, fondDeCaisse)
}

// CreateAnnualClosure creates an annual closure bulletin
func (s *ClosureService) CreateAnnualClosure(ctx context.Context, schemaName, establishmentID string, year int, fondDeCaisse float64) (*models.ClosureBulletin, error) {
	startDate := time.Date(year, time.January, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(year+1, time.January, 1, 0, 0, 0, 0, time.UTC).Add(-time.Nanosecond)
	return s.createPeriodClosure(ctx, schemaName, establishmentID, "ANNUAL", startDate, endDate, fondDeCaisse)
}

// createPeriodClosure is the generic closure creation method
func (s *ClosureService) createPeriodClosure(ctx context.Context, schemaName, establishmentID, closureType string, startDate, endDate time.Time, fondDeCaisse float64) (*models.ClosureBulletin, error) {
	// Check if closure already exists for this period
	exists, err := s.journalRepo.ClosureExists(ctx, establishmentID, closureType, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing closure: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("une clôture %s existe déjà pour cette période", closureType)
	}

	// Get legal journal entries for the period
	entries, err := s.journalRepo.GetEntries(ctx, schemaName, &startDate, &endDate, nil, 10000, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get journal entries: %w", err)
	}

	// Get orders for the period
	orders, err := s.orderRepo.GetOrdersByPeriod(ctx, schemaName, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get orders: %w", err)
	}

	// Calculate journal totals (source of truth)
	var journalAmount, journalVAT float64
	journalCount := 0
	firstSeq := -1
	lastSeq := 0
	paymentBreakdown := make(map[string]float64)

	for _, entry := range entries {
		if firstSeq == -1 || entry.SequenceNumber < firstSeq {
			firstSeq = entry.SequenceNumber
		}
		if entry.SequenceNumber > lastSeq {
			lastSeq = entry.SequenceNumber
		}
		if entry.TransactionType == "SALE" || entry.TransactionType == "REFUND" {
			journalCount++
			journalAmount += entry.Amount
			journalVAT += entry.VATAmount
			paymentBreakdown[entry.PaymentMethod] += entry.Amount
		}
	}
	if firstSeq == -1 {
		firstSeq = 0
	}

	// Calculate VAT breakdown and tips/change from orders
	vatBreakdown := map[string]map[string]float64{
		"vat_10": {"amount": 0, "vat": 0, "ttc": 0},
		"vat_20": {"amount": 0, "vat": 0, "ttc": 0},
	}
	var tipTotal, changeTotal float64

	for _, order := range orders {
		if order.Status != "COMPLETED" && order.Status != "REFUNDED" {
			continue
		}
		sign := 1.0
		if order.Status == "REFUNDED" {
			sign = -1.0
		}
		tipTotal += sign * order.Tips
		changeTotal += sign * order.Change

		items, err := s.orderRepo.GetOrderItems(ctx, schemaName, order.ID)
		if err != nil {
			continue
		}
		for _, item := range items {
			var bucket string
			if item.TaxRate <= 0.15 || (item.TaxRate >= 9 && item.TaxRate <= 11) {
				bucket = "vat_10"
			} else {
				bucket = "vat_20"
			}
			baseAmount := item.Subtotal - item.TaxAmount
			vatBreakdown[bucket]["amount"] += sign * baseAmount
			vatBreakdown[bucket]["vat"] += sign * item.TaxAmount
			vatBreakdown[bucket]["ttc"] += sign * item.Subtotal
		}
	}

	// Round VAT breakdown
	for bucket := range vatBreakdown {
		for key := range vatBreakdown[bucket] {
			vatBreakdown[bucket][key] = roundTo4(vatBreakdown[bucket][key])
		}
	}

	// Total from VAT breakdown
	totalAmount := roundTo4(vatBreakdown["vat_10"]["ttc"] + vatBreakdown["vat_20"]["ttc"])
	totalVAT := roundTo4(vatBreakdown["vat_10"]["vat"] + vatBreakdown["vat_20"]["vat"])

	// Reconciliation
	reconciliation := computeReconciliation(
		journalCount, totalAmount, totalVAT,
		journalCount, roundTo4(journalAmount), roundTo4(journalVAT),
	)

	// Generate closure hash (matches TypeScript format)
	closureData := fmt.Sprintf("%s|%s|%s|%d|%.4f|%.4f|%d|%d",
		closureType,
		startDate.Format(time.RFC3339),
		endDate.Format(time.RFC3339),
		journalCount,
		totalAmount,
		totalVAT,
		firstSeq,
		lastSeq,
	)
	hash := crypto.CalculateHash("", startDate, closureType, totalAmount, closureData)

	// Marshal JSON fields
	vatJSON, _ := json.Marshal(vatBreakdown)
	paymentJSON, _ := json.Marshal(paymentBreakdown)
	reconciliationJSON, _ := json.Marshal(reconciliation)

	_ = reconciliationJSON // stored in future schema update

	bulletin := &models.ClosureBulletin{
		EstablishmentID:         establishmentID,
		ClosureType:             closureType,
		PeriodStart:             startDate,
		PeriodEnd:               endDate,
		TotalTransactions:       journalCount,
		FondDeCaisse:           fondDeCaisse,
		TotalAmount:            totalAmount,
		TotalVAT:               totalVAT,
		VATBreakdown:           string(vatJSON),
		PaymentMethodsBreakdown: string(paymentJSON),
		TipsTotal:              roundTo4(tipTotal),
		ChangeTotal:            roundTo4(changeTotal),
		FirstSequence:          &firstSeq,
		LastSequence:           &lastSeq,
		ClosureHash:            hash,
		IsClosed:               true,
	}

	if err := s.journalRepo.InsertClosureBulletin(ctx, bulletin); err != nil {
		return nil, fmt.Errorf("failed to save closure bulletin: %w", err)
	}

	return bulletin, nil
}

// GetClosureBulletins retrieves closure bulletins with optional filters
func (s *ClosureService) GetClosureBulletins(ctx context.Context, schemaName, establishmentID string, closureType *string, startDate, endDate *time.Time) ([]models.ClosureBulletin, error) {
	return s.journalRepo.GetClosureBulletins(ctx, establishmentID, closureType, startDate, endDate)
}
