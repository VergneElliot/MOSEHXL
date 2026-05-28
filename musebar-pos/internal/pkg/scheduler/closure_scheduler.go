package scheduler

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"musebar-pos/internal/domain/legal"
	"musebar-pos/internal/pkg/audit"
	"musebar-pos/internal/pkg/logger"
	"musebar-pos/internal/repository/postgres"
)

// ClosureSettings holds per-establishment auto-closure configuration
type ClosureSettings struct {
	EstablishmentID    string
	AutoClosureEnabled bool
	DailyClosureTime   string // "HH:MM"
	Timezone           string
	GracePeriodMinutes int
}

// ClosureScheduler handles automatic daily closures
type ClosureScheduler struct {
	db             *pgxpool.Pool
	closureService *legal.ClosureService
	auditService   *audit.Service
	orderRepo      *postgres.OrderRepositoryPostgres
	mu             sync.Mutex
	running        bool
	stopCh         chan struct{}
}

// New creates a new ClosureScheduler
func New(db *pgxpool.Pool, closureService *legal.ClosureService, auditService *audit.Service) *ClosureScheduler {
	return &ClosureScheduler{
		db:             db,
		closureService: closureService,
		auditService:   auditService,
		stopCh:         make(chan struct{}),
	}
}

// Start begins the scheduler - checks every 5 minutes
func (s *ClosureScheduler) Start() {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return
	}
	s.running = true
	s.mu.Unlock()

	logger.Info("🕐 Auto-closure scheduler started (checks every 5 minutes)")

	go func() {
		// Check immediately on start
		s.checkAndExecuteClosures()

		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				s.checkAndExecuteClosures()
			case <-s.stopCh:
				logger.Info("🛑 Auto-closure scheduler stopped")
				return
			}
		}
	}()
}

// Stop halts the scheduler
func (s *ClosureScheduler) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.running {
		s.stopCh <- struct{}{}
		s.running = false
	}
}

// Status returns scheduler status
func (s *ClosureScheduler) Status() map[string]interface{} {
	s.mu.Lock()
	defer s.mu.Unlock()
	return map[string]interface{}{
		"running":      s.running,
		"check_interval": "5 minutes",
	}
}

// checkAndExecuteClosures checks all establishments and runs closures if needed
func (s *ClosureScheduler) checkAndExecuteClosures() {
	ctx := context.Background()

	// Get all establishments
	rows, err := s.db.Query(ctx, `
		SELECT e.id, e.schema_name,
		       COALESCE(cs.auto_closure_enabled, false),
		       COALESCE(cs.daily_closure_time, '02:00'),
		       COALESCE(cs.timezone, 'Europe/Paris'),
		       COALESCE(cs.grace_period_minutes, 30)
		FROM establishments e
		LEFT JOIN closure_settings cs ON cs.establishment_id = e.id
	`)
	if err != nil {
		logger.Error("Scheduler: failed to fetch establishments", err)
		return
	}
	defer rows.Close()

	var settings []struct {
		EstablishmentID  string
		SchemaName       string
		ClosureSettings
	}

	for rows.Next() {
		var s struct {
			EstablishmentID  string
			SchemaName       string
			ClosureSettings
		}
		err := rows.Scan(
			&s.EstablishmentID, &s.SchemaName,
			&s.AutoClosureEnabled, &s.DailyClosureTime,
			&s.Timezone, &s.GracePeriodMinutes,
		)
		if err != nil {
			continue
		}
		s.ClosureSettings.EstablishmentID = s.EstablishmentID
		settings = append(settings, s)
	}

	now := time.Now()
	for _, est := range settings {
		if !est.AutoClosureEnabled {
			continue
		}

		if s.shouldRunClosure(now, est.DailyClosureTime, est.GracePeriodMinutes) {
			go s.executeClosureForEstablishment(est.EstablishmentID, est.SchemaName, now)
		}
	}
}

// shouldRunClosure checks if current time is within the closure window
func (s *ClosureScheduler) shouldRunClosure(now time.Time, closureTime string, gracePeriodMinutes int) bool {
	parts := strings.Split(closureTime, ":")
	if len(parts) != 2 {
		return false
	}

	var hour, minute int
	fmt.Sscanf(parts[0], "%d", &hour)
	fmt.Sscanf(parts[1], "%d", &minute)

	// Build target time for today
	target := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, now.Location())

	// Check if we're within the grace period after the target time
	if now.Before(target) {
		return false
	}

	elapsed := now.Sub(target)
	return elapsed <= time.Duration(gracePeriodMinutes)*time.Minute
}

// executeClosureForEstablishment runs the daily closure for one establishment
func (s *ClosureScheduler) executeClosureForEstablishment(establishmentID, schemaName string, now time.Time) {
	ctx := context.Background()

	// The business day is yesterday if we're closing after midnight
	businessDay := now.AddDate(0, 0, -1)

	logger.Info(fmt.Sprintf("🔒 Auto-closure: running for establishment %s (date: %s)",
		establishmentID, businessDay.Format("2006-01-02")))

	_, err := s.closureService.CreateDailyClosure(
		ctx, schemaName, establishmentID,
		businessDay, 0, // fond_de_caisse = 0 for auto-closures
	)

	if err != nil {
		// Check if already exists (expected case)
		if strings.Contains(err.Error(), "existe déjà") {
			logger.Info(fmt.Sprintf("Auto-closure: already exists for %s", businessDay.Format("2006-01-02")))
			return
		}

		logger.Error("Auto-closure failed", err, map[string]interface{}{
			"establishment_id": establishmentID,
			"date":             businessDay.Format("2006-01-02"),
		})

		s.auditService.Log(ctx, audit.Entry{
			EstablishmentID: establishmentID,
			ActionType:      "AUTO_CLOSURE_FAILED",
			ActionDetails: map[string]interface{}{
				"error":  err.Error(),
				"date":   businessDay.Format("2006-01-02"),
				"trigger": "AUTOMATIC",
			},
			IPAddress: "system",
			UserAgent: "ClosureScheduler",
		})
		return
	}

	logger.Info(fmt.Sprintf("✅ Auto-closure: success for %s", businessDay.Format("2006-01-02")))

	s.auditService.Log(ctx, audit.Entry{
		EstablishmentID: establishmentID,
		ActionType:      "AUTO_CLOSURE_EXECUTED",
		ActionDetails: map[string]interface{}{
			"date":    businessDay.Format("2006-01-02"),
			"trigger": "AUTOMATIC",
		},
		IPAddress: "system",
		UserAgent: "ClosureScheduler",
	})
}

// TriggerManual manually triggers a closure check (for testing/admin use)
func (s *ClosureScheduler) TriggerManual() {
	logger.Info("🔧 Manual closure check triggered")
	s.checkAndExecuteClosures()
}

