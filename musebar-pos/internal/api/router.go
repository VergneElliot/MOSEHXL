package api

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"musebar-pos/internal/api/handlers"
	authmw "musebar-pos/internal/middleware/auth"
	"musebar-pos/internal/domain/legal"
	"musebar-pos/internal/repository/postgres"
)

// NewRouter creates and configures the HTTP router
func NewRouter(db *pgxpool.Pool) http.Handler {
	mux := http.NewServeMux()

	// Initialize repositories
	legalRepo := postgres.NewLegalRepository(db)
	productRepo := postgres.NewProductRepository(db)
	orderRepo := postgres.NewOrderRepository(db)
	userRepo := postgres.NewUserRepository(db)

	// Initialize services
	journalService := legal.NewJournalService(legalRepo)

	// Initialize handlers
	legalHandler := handlers.NewLegalHandler(journalService, legalRepo)
	productHandler := handlers.NewProductHandler(productRepo)
	orderHandler := handlers.NewOrderHandler(orderRepo, productRepo, journalService)
	authHandler := handlers.NewAuthHandler(userRepo)
	happyHourHandler := handlers.NewHappyHourHandler(productRepo)

	// Public endpoints (no auth required)
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"musebar-pos"}`))
	})

	// Auth endpoints
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/auth/logout", authmw.RequireAuth(authHandler.Logout))
	mux.HandleFunc("GET /api/auth/me", authmw.RequireAuth(authHandler.Me))

	// Protected endpoints - use real auth
	// Legal endpoints
	mux.HandleFunc("GET /api/legal/journal/verify", authmw.RequireAuth(legalHandler.VerifyJournalIntegrity))
	mux.HandleFunc("GET /api/legal/journal/entries", authmw.RequireAuth(legalHandler.GetJournalEntries))
	mux.HandleFunc("GET /api/legal/journal/stats", authmw.RequireAuth(legalHandler.GetJournalStats))
	mux.HandleFunc("GET /api/legal/closure", authmw.RequireAuth(legalHandler.GetClosureBulletins))

	// Category endpoints
	mux.HandleFunc("POST /api/categories", authmw.RequireAuth(productHandler.CreateCategory))
	mux.HandleFunc("GET /api/categories", authmw.RequireAuth(productHandler.GetCategories))
	mux.HandleFunc("GET /api/categories/{id}", authmw.RequireAuth(productHandler.GetCategory))
	mux.HandleFunc("PATCH /api/categories/{id}", authmw.RequireAuth(productHandler.UpdateCategory))
	mux.HandleFunc("DELETE /api/categories/{id}", authmw.RequireAdmin(productHandler.ArchiveCategory))

	// Product endpoints
	mux.HandleFunc("POST /api/products", authmw.RequireAuth(productHandler.CreateProduct))
	mux.HandleFunc("GET /api/products", authmw.RequireAuth(productHandler.GetProducts))
	mux.HandleFunc("GET /api/products/{id}", authmw.RequireAuth(productHandler.GetProduct))
	mux.HandleFunc("PATCH /api/products/{id}", authmw.RequireAuth(productHandler.UpdateProduct))
	mux.HandleFunc("DELETE /api/products/{id}", authmw.RequireAdmin(productHandler.ArchiveProduct))

	// Order endpoints
	mux.HandleFunc("POST /api/orders", authmw.RequireAuth(orderHandler.CreateOrder))
	mux.HandleFunc("GET /api/orders", authmw.RequireAuth(orderHandler.GetOrders))
	mux.HandleFunc("GET /api/orders/{id}", authmw.RequireAuth(orderHandler.GetOrder))
	mux.HandleFunc("POST /api/orders/{id}/refund", authmw.RequireAuth(orderHandler.RefundOrder))

	// Happy Hour endpoints (admin only)
	mux.HandleFunc("POST /api/happy-hour/toggle", authmw.RequireAdmin(happyHourHandler.ToggleHappyHour))
	mux.HandleFunc("GET /api/happy-hour/status", authmw.RequireAuth(happyHourHandler.GetHappyHourStatus))
	mux.HandleFunc("PATCH /api/products/{id}/happy-hour", authmw.RequireAdmin(happyHourHandler.SetProductHappyHourPrice))

	return mux
}
