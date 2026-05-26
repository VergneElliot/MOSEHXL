package api

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"musebar-pos/internal/api/handlers"
	"musebar-pos/internal/api/middleware"
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

	// Initialize services
	journalService := legal.NewJournalService(legalRepo)

	// Initialize handlers
	legalHandler := handlers.NewLegalHandler(journalService, legalRepo)
	productHandler := handlers.NewProductHandler(productRepo)
	orderHandler := handlers.NewOrderHandler(orderRepo, productRepo, journalService)

	// Health check
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"musebar-pos"}`))
	})

	// Legal endpoints
	mux.HandleFunc("GET /api/legal/journal/verify", middleware.InjectTestEstablishment(legalHandler.VerifyJournalIntegrity))
	mux.HandleFunc("GET /api/legal/journal/entries", middleware.InjectTestEstablishment(legalHandler.GetJournalEntries))
	mux.HandleFunc("GET /api/legal/journal/stats", middleware.InjectTestEstablishment(legalHandler.GetJournalStats))
	mux.HandleFunc("GET /api/legal/closure", middleware.InjectTestEstablishment(legalHandler.GetClosureBulletins))

	// Category endpoints
	mux.HandleFunc("POST /api/categories", middleware.InjectTestEstablishment(productHandler.CreateCategory))
	mux.HandleFunc("GET /api/categories", middleware.InjectTestEstablishment(productHandler.GetCategories))
	mux.HandleFunc("GET /api/categories/{id}", middleware.InjectTestEstablishment(productHandler.GetCategory))
	mux.HandleFunc("PATCH /api/categories/{id}", middleware.InjectTestEstablishment(productHandler.UpdateCategory))
	mux.HandleFunc("DELETE /api/categories/{id}", middleware.InjectTestEstablishment(productHandler.ArchiveCategory))

	// Product endpoints
	mux.HandleFunc("POST /api/products", middleware.InjectTestEstablishment(productHandler.CreateProduct))
	mux.HandleFunc("GET /api/products", middleware.InjectTestEstablishment(productHandler.GetProducts))
	mux.HandleFunc("GET /api/products/{id}", middleware.InjectTestEstablishment(productHandler.GetProduct))
	mux.HandleFunc("PATCH /api/products/{id}", middleware.InjectTestEstablishment(productHandler.UpdateProduct))
	mux.HandleFunc("DELETE /api/products/{id}", middleware.InjectTestEstablishment(productHandler.ArchiveProduct))

	// Order endpoints
	mux.HandleFunc("POST /api/orders", middleware.InjectTestEstablishment(orderHandler.CreateOrder))
	mux.HandleFunc("GET /api/orders", middleware.InjectTestEstablishment(orderHandler.GetOrders))
	mux.HandleFunc("GET /api/orders/{id}", middleware.InjectTestEstablishment(orderHandler.GetOrder))
	mux.HandleFunc("POST /api/orders/{id}/refund", middleware.InjectTestEstablishment(orderHandler.RefundOrder))

	return mux
}
