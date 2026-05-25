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
func (s *ClosureService) GenerateDailyClosure(ctx context.Context, establishmentID string, date time.Time) (*models.ClosureBulletin, error) {
	startDate := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endDate := startDate.Add(24*time.Hour - time.Nanosecond)
	return s.generateClosure(ctx, establishmentID, "DAILY", startDate, endDate)
}

// GenerateWeeklyClosure creates a weekly closure bulletin
func (s *ClosureService) GenerateWeeklyClosure(ctx context.Context, establishmentID string, startDate time.Time) (*models.ClosureBulletin, error) {
	endDate := startDate.AddDate(0, 0, 7).Add(-time.Nanosecond)
	return s.generateClosure(ctx, establishmentID, "WEEKLY", startDate, endDate)
}

// GenerateMonthlyClosure creates a monthly closure bulletin
func (s *ClosureService) GenerateMonthlyClosure(ctx context.Context, establishmentID string, year int, month time.Month) (*models.ClosureBulletin, error) {
	startDate := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Nanosecond)
	return s.generateClosure(ctx, establishmentID, "MONTHLY", startDate, endDate)
}

// GenerateAnnualClosure creates an annual closure bulletin
func (s *ClosureService) GenerateAnnualClosure(ctx context.Context, establishmentID string, year int) (*models.ClosureBulletin, error) {
	startDate := time.Date(year, time.January, 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(1, 0, 0).Add(-time.Nanosecond)
	return s.generateClosure(ctx, establishmentID, "ANNUAL", startDate, endDate)
}

// generateClosure creates a closure bulletin for the given period
func (s *ClosureService) generateClosure(ctx context.Context, establishmentID string, bulletinType string, startDate, endDate time.Time) (*models.ClosureBulletin, error) {
	// Note: This is a simplified version
	// In production, you'd get orders from the schema-scoped repository
	
	// Create closure bulletin with basic data
	bulletin := &models.ClosureBulletin{
		EstablishmentID:         establishmentID,
		ClosureType:             bulletinType,
		PeriodStart:             startDate,
		PeriodEnd:               endDate,
		TotalTransactions:       0,
		FondDeCaisse:            0,
		TotalAmount:             0,
		TotalVAT:                0,
		VATBreakdown:            "{}",
		PaymentMethodsBreakdown: "{}",
		TipsTotal:               0,
		ChangeTotal:             0,
		ClosureHash:             "placeholder_hash", // TODO: Calculate proper hash
		IsClosed:                false,
		CreatedAt:               time.Now().UTC(),
	}

	// Insert bulletin into database
	if err := s.journalRepo.InsertClosureBulletin(ctx, bulletin); err != nil {
		return nil, fmt.Errorf("failed to insert closure bulletin: %w", err)
	}

	return bulletin, nil
}

// GetClosureBulletin retrieves a specific closure bulletin
func (s *ClosureService) GetClosureBulletin(ctx context.Context, bulletinID int64) (*models.ClosureBulletin, error) {
	return s.journalRepo.GetClosureBulletin(ctx, bulletinID)
}

// GetClosureBulletins retrieves closure bulletins with filters
func (s *ClosureService) GetClosureBulletins(ctx context.Context, establishmentID string, bulletinType *string, startDate, endDate *time.Time) ([]models.ClosureBulletin, error) {
	return s.journalRepo.GetClosureBulletins(ctx, establishmentID, bulletinType, startDate, endDate)
}
