package api

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"musebar-pos/internal/api/handlers"
	"musebar-pos/internal/config"
	"musebar-pos/internal/domain/legal"
	corsmw "musebar-pos/internal/middleware/cors"
	authmw "musebar-pos/internal/middleware/auth"
	"musebar-pos/internal/repository/postgres"
)

func NewRouter(db *pgxpool.Pool, cfg *config.Config) http.Handler {
	mux := http.NewServeMux()

	// Repositories
	legalRepo := postgres.NewLegalRepository(db)
	productRepo := postgres.NewProductRepository(db)
	orderRepo := postgres.NewOrderRepository(db)
	userRepo := postgres.NewUserRepository(db)
	refreshRepo := postgres.NewRefreshTokenRepository(db)

	// Services
	journalService := legal.NewJournalService(legalRepo)
	closureService := legal.NewClosureService(legalRepo, orderRepo)

	// Handlers
	legalHandler := handlers.NewLegalHandler(journalService, legalRepo)
	productHandler := handlers.NewProductHandler(productRepo)
	orderHandler := handlers.NewOrderHandler(orderRepo, productRepo, journalService)
	authHandler := handlers.NewAuthHandler(userRepo, refreshRepo)
	happyHourHandler := handlers.NewHappyHourHandler(productRepo)
	closureHandler := handlers.NewClosureHandler(closureService)

	// Public
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"musebar-pos","version":"1.0.0"}`))
	})

	// Auth endpoints
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/auth/refresh", authHandler.Refresh)
	mux.HandleFunc("POST /api/auth/logout", authmw.RequireAuth(authHandler.Logout))
	mux.HandleFunc("GET /api/auth/me", authmw.RequireAuth(authHandler.Me))

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

	// Apply middleware stack (order matters: CORS → DB injection → router)
	handler := authmw.WithDB(db)(mux)
	handler = corsmw.Middleware(corsmw.Config{
		AllowedOrigins: cfg.CORSOrigins,
		IsDevelopment:  cfg.Environment == "development",
	})(handler)

	return handler
}
