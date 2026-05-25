package legal

import (
	"context"
	"fmt"
	"time"

	"musebar-pos/internal/models"
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

// GenerateDailyClosure creates a daily closure bulletin
// This is typically run at 02:00 Paris time via scheduler
func (s *ClosureService) GenerateDailyClosure(ctx context.Context, establishmentID int64, date time.Time) (*models.ClosureBulletin, error) {
	// Define day boundaries (00:00:00 to 23:59:59)
	startDate := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endDate := startDate.Add(24*time.Hour - time.Nanosecond)

	return s.generateClosure(ctx, establishmentID, "DAILY", startDate, endDate)
}

// GenerateWeeklyClosure creates a weekly closure bulletin
func (s *ClosureService) GenerateWeeklyClosure(ctx context.Context, establishmentID int64, startDate time.Time) (*models.ClosureBulletin, error) {
	endDate := startDate.AddDate(0, 0, 7).Add(-time.Nanosecond)
	return s.generateClosure(ctx, establishmentID, "WEEKLY", startDate, endDate)
}

// GenerateMonthlyClosure creates a monthly closure bulletin
func (s *ClosureService) GenerateMonthlyClosure(ctx context.Context, establishmentID int64, year int, month time.Month) (*models.ClosureBulletin, error) {
	startDate := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Nanosecond)
	return s.generateClosure(ctx, establishmentID, "MONTHLY", startDate, endDate)
}

// GenerateAnnualClosure creates an annual closure bulletin
func (s *ClosureService) GenerateAnnualClosure(ctx context.Context, establishmentID int64, year int) (*models.ClosureBulletin, error) {
	startDate := time.Date(year, time.January, 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(1, 0, 0).Add(-time.Nanosecond)
	return s.generateClosure(ctx, establishmentID, "ANNUAL", startDate, endDate)
}

// generateClosure creates a closure bulletin for the given period
func (s *ClosureService) generateClosure(ctx context.Context, establishmentID int64, bulletinType string, startDate, endDate time.Time) (*models.ClosureBulletin, error) {
	// Get all orders for the period
	orders, err := s.orderRepo.GetOrdersByPeriod(ctx, establishmentID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get orders: %w", err)
	}

	// Calculate aggregates
	var totalSales, totalRefunds, netRevenue float64
	var cashAmount, cardAmount float64
	var vat550Amount, vat550Base, vat1000Amount, vat1000Base, vat2000Amount, vat2000Base float64
	transactionCount := 0
	refundCount := 0

	for _, order := range orders {
		if order.Status == "CANCELLED" || order.Status == "REFUNDED" {
			totalRefunds += order.Total
			refundCount++
		} else {
			totalSales += order.Total
			transactionCount++

			// Payment method breakdown
			if order.PaymentMethod == "CASH" {
				cashAmount += order.Total
			} else if order.PaymentMethod == "CARD" {
				cardAmount += order.Total
			}

			// VAT breakdown (extract from order items)
			// This would iterate through order_items and sum by tax rate
			// Simplified here - you'd join with order_items in real implementation
		}
	}

	netRevenue = totalSales - totalRefunds

	// Create closure bulletin
	bulletin := &models.ClosureBulletin{
		EstablishmentID:  establishmentID,
		Type:             bulletinType,
		StartDate:        startDate,
		EndDate:          endDate,
		TotalSales:       totalSales,
		TotalRefunds:     totalRefunds,
		NetRevenue:       netRevenue,
		CashAmount:       cashAmount,
		CardAmount:       cardAmount,
		VAT550Amount:     vat550Amount,
		VAT550Base:       vat550Base,
		VAT1000Amount:    vat1000Amount,
		VAT1000Base:      vat1000Base,
		VAT2000Amount:    vat2000Amount,
		VAT2000Base:      vat2000Base,
		TransactionCount: transactionCount,
		RefundCount:      refundCount,
		CreatedAt:        time.Now().UTC(),
	}

	// Insert bulletin into database
	if err := s.journalRepo.InsertClosureBulletin(ctx, bulletin); err != nil {
		return nil, fmt.Errorf("failed to insert closure bulletin: %w", err)
	}

	// Record CLOSURE entry in legal journal
	closureData := map[string]interface{}{
		"bulletin_id": bulletin.ID,
		"type":        bulletinType,
		"start_date":  startDate,
		"end_date":    endDate,
		"total_sales": totalSales,
		"net_revenue": netRevenue,
	}

	// This would call the journal service to record the closure
	// For now, we'll skip this to avoid circular dependency
	// You'd inject JournalService or use a separate closure recorder

	return bulletin, nil
}

// GetClosureBulletin retrieves a specific closure bulletin
func (s *ClosureService) GetClosureBulletin(ctx context.Context, bulletinID int64) (*models.ClosureBulletin, error) {
	return s.journalRepo.GetClosureBulletin(ctx, bulletinID)
}

// GetClosureBulletins retrieves closure bulletins with filters
func (s *ClosureService) GetClosureBulletins(ctx context.Context, establishmentID int64, bulletinType *string, startDate, endDate *time.Time) ([]models.ClosureBulletin, error) {
	return s.journalRepo.GetClosureBulletins(ctx, establishmentID, bulletinType, startDate, endDate)
}
