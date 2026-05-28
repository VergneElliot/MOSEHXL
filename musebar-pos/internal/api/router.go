package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"musebar-pos/internal/api/handlers"
	"musebar-pos/internal/config"
	"musebar-pos/internal/domain/legal"
	authmw "musebar-pos/internal/middleware/auth"
	corsmw "musebar-pos/internal/middleware/cors"
	"musebar-pos/internal/pkg/audit"
	"musebar-pos/internal/pkg/email"
	"musebar-pos/internal/pkg/logger"
	"musebar-pos/internal/pkg/scheduler"
	"musebar-pos/internal/repository/postgres"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewRouter(db *pgxpool.Pool, cfg *config.Config) (http.Handler, *scheduler.ClosureScheduler) {
	mux := http.NewServeMux()

	// Repositories
	legalRepo := postgres.NewLegalRepository(db)
	productRepo := postgres.NewProductRepository(db)
	orderRepo := postgres.NewOrderRepository(db)
	userRepo := postgres.NewUserRepository(db)
	refreshRepo := postgres.NewRefreshTokenRepository(db)

	auditService := audit.New(db)
	inviteRepo := postgres.NewInvitationRepository(db)

	// Email service (non-fatal if not configured)
	var emailSender email.EmailSender
	emailSender, err := email.NewFromConfig(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom)
	if err != nil {
		fmt.Printf("WARNING: Email service not configured: %v\n", err)
	}

	healthHandler := handlers.NewHealthHandler(db)

	// Services
	journalService := legal.NewJournalService(legalRepo)
	closureService := legal.NewClosureService(legalRepo, orderRepo)

	// Initialize scheduler
	closureScheduler := scheduler.New(db, closureService, auditService)

	// Handlers
	legalHandler := handlers.NewLegalHandler(journalService, legalRepo)
	productHandler := handlers.NewProductHandler(productRepo)
	orderHandler := handlers.NewOrderHandler(orderRepo, productRepo, journalService)
	authHandler := handlers.NewAuthHandler(userRepo, refreshRepo, auditService)
	happyHourHandler := handlers.NewHappyHourHandler(productRepo)
	oauthHandler := handlers.NewOAuthHandler(cfg, userRepo, refreshRepo)
	userHandler := handlers.NewUserHandler(userRepo, auditService)
	invitationHandler := handlers.NewInvitationHandler(cfg, userRepo, inviteRepo, emailSender)
	closureHandler := handlers.NewClosureHandler(closureService)

	// Public
	mux.HandleFunc("GET /api/health", healthHandler.Health)
	mux.HandleFunc("GET /api/health/ready", healthHandler.Ready)
	mux.HandleFunc("GET /api/health/live", healthHandler.Live)

	// Auth endpoints
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/auth/refresh", authHandler.Refresh)
	mux.HandleFunc("POST /api/auth/logout", authmw.RequireAuth(authHandler.Logout))
	mux.HandleFunc("GET /api/auth/me", authmw.RequireAuth(authHandler.Me))

	// Scheduler endpoints
	mux.HandleFunc("GET /api/scheduler/status", authmw.RequireAdmin(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(closureScheduler.Status())
	}))
	mux.HandleFunc("POST /api/scheduler/trigger", authmw.RequireAdmin(func(w http.ResponseWriter, r *http.Request) {
		go closureScheduler.TriggerManual()
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message":"Manual closure check triggered"}`))
	}))
	mux.HandleFunc("PATCH /api/scheduler/settings", authmw.RequireAdmin(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Enabled            *bool   `json:"auto_closure_enabled"`
			DailyClosureTime   *string `json:"daily_closure_time"`
			GracePeriodMinutes *int    `json:"grace_period_minutes"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
		estID := r.Context().Value("establishment_id").(string)
		_, err := db.Exec(r.Context(), `
			INSERT INTO closure_settings (establishment_id, auto_closure_enabled, daily_closure_time, grace_period_minutes, updated_at)
			VALUES ($1::uuid, COALESCE($2, false), COALESCE($3, '02:00'), COALESCE($4, 30), NOW())
			ON CONFLICT (establishment_id) DO UPDATE
			SET auto_closure_enabled = COALESCE($2, closure_settings.auto_closure_enabled),
			    daily_closure_time = COALESCE($3, closure_settings.daily_closure_time),
			    grace_period_minutes = COALESCE($4, closure_settings.grace_period_minutes),
			    updated_at = NOW()
		`, estID, req.Enabled, req.DailyClosureTime, req.GracePeriodMinutes)
		if err != nil {
			http.Error(w, "Failed to update settings", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message":"Settings updated"}`))
	}))

		// Audit trail (admin only)
	mux.HandleFunc("GET /api/audit", authmw.RequireAdmin(func(w http.ResponseWriter, r *http.Request) {
		estID := r.Context().Value("establishment_id").(string)
		entries, err := auditService.GetByEstablishment(r.Context(), estID, 100, 0)
		if err != nil {
			http.Error(w, "Failed to fetch audit log", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"entries": entries, "total": len(entries)})
	}))

	// User management endpoints (admin only)
	mux.HandleFunc("GET /api/users", authmw.RequireAdmin(userHandler.ListUsers))
	mux.HandleFunc("POST /api/users", authmw.RequireAdmin(userHandler.CreateUser))
	mux.HandleFunc("PATCH /api/users/{id}", authmw.RequireAdmin(userHandler.UpdateUser))
	mux.HandleFunc("DELETE /api/users/{id}", authmw.RequireAdmin(userHandler.DeactivateUser))
	mux.HandleFunc("POST /api/auth/change-password", authmw.RequireAuth(userHandler.ChangePassword))

	// Password reset (public)
	mux.HandleFunc("POST /api/auth/forgot-password", invitationHandler.ForgotPassword)
	mux.HandleFunc("POST /api/auth/reset-password", invitationHandler.ResetPassword)

	// Invitation endpoints
	mux.HandleFunc("POST /api/users/invite", authmw.RequireAdmin(invitationHandler.InviteUser))
	mux.HandleFunc("GET /api/invitations/info", invitationHandler.GetInvitationInfo)
	mux.HandleFunc("POST /api/invitations/accept", invitationHandler.AcceptInvitation)

	// Google OAuth endpoints
	mux.HandleFunc("GET /api/auth/google", oauthHandler.GoogleLogin)
	mux.HandleFunc("GET /api/auth/google/callback", oauthHandler.GoogleCallback)

	// Legal journal
	mux.HandleFunc("GET /api/legal/journal/verify", authmw.RequireAuth(legalHandler.VerifyJournalIntegrity))
	mux.HandleFunc("GET /api/legal/journal/entries", authmw.RequireAuth(legalHandler.GetJournalEntries))
	mux.HandleFunc("GET /api/legal/journal/stats", authmw.RequireAuth(legalHandler.GetJournalStats))

	// Closures
	mux.HandleFunc("POST /api/legal/closure/daily", authmw.RequireAdmin(closureHandler.CreateDailyClosure))
	mux.HandleFunc("POST /api/legal/closure/monthly", authmw.RequireAdmin(closureHandler.CreateMonthlyClosure))
	mux.HandleFunc("POST /api/legal/closure/annual", authmw.RequireAdmin(closureHandler.CreateAnnualClosure))
	mux.HandleFunc("GET /api/legal/closure", authmw.RequireAuth(closureHandler.GetClosures))

	// Categories
	mux.HandleFunc("POST /api/categories", authmw.RequireAuth(productHandler.CreateCategory))
	mux.HandleFunc("GET /api/categories", authmw.RequireAuth(productHandler.GetCategories))
	mux.HandleFunc("GET /api/categories/{id}", authmw.RequireAuth(productHandler.GetCategory))
	mux.HandleFunc("PATCH /api/categories/{id}", authmw.RequireAuth(productHandler.UpdateCategory))
	mux.HandleFunc("PATCH /api/categories/{id}/reorder", authmw.RequireAdmin(productHandler.ReorderCategory))
	mux.HandleFunc("DELETE /api/categories/{id}", authmw.RequireAdmin(productHandler.ArchiveCategory))

	// Products
	mux.HandleFunc("POST /api/products", authmw.RequireAuth(productHandler.CreateProduct))
	mux.HandleFunc("GET /api/products", authmw.RequireAuth(productHandler.GetProducts))
	mux.HandleFunc("GET /api/products/{id}", authmw.RequireAuth(productHandler.GetProduct))
	mux.HandleFunc("PATCH /api/products/{id}", authmw.RequireAuth(productHandler.UpdateProduct))
	mux.HandleFunc("PATCH /api/products/{id}/reorder", authmw.RequireAdmin(productHandler.ReorderProduct))
	mux.HandleFunc("DELETE /api/products/{id}", authmw.RequireAdmin(productHandler.ArchiveProduct))

	// Orders
	mux.HandleFunc("POST /api/orders", authmw.RequireAuth(orderHandler.CreateOrder))
	mux.HandleFunc("GET /api/orders", authmw.RequireAuth(orderHandler.GetOrders))
	mux.HandleFunc("GET /api/orders/{id}", authmw.RequireAuth(orderHandler.GetOrder))
	mux.HandleFunc("POST /api/orders/{id}/refund", authmw.RequireAuth(orderHandler.RefundOrder))

	// Happy Hour
	mux.HandleFunc("POST /api/happy-hour/toggle", authmw.RequireAdmin(happyHourHandler.ToggleHappyHour))
	mux.HandleFunc("GET /api/happy-hour/status", authmw.RequireAuth(happyHourHandler.GetHappyHourStatus))
	mux.HandleFunc("PATCH /api/products/{id}/happy-hour", authmw.RequireAdmin(happyHourHandler.SetProductHappyHourPrice))

	// Apply middleware stack (order matters: CORS → RequestLogger → DB injection → router)
	handler := authmw.WithDB(db)(mux)
	handler = logger.RequestLogger(logger.Get())(handler)
	handler = corsmw.Middleware(corsmw.Config{
		AllowedOrigins: cfg.CORSOrigins,
		IsDevelopment:  cfg.Environment == "development",
	})(handler)

	return handler, closureScheduler
}
