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

	// Initialize services
	journalService := legal.NewJournalService(legalRepo)

	// Initialize handlers
	legalHandler := handlers.NewLegalHandler(journalService, legalRepo)

	// Health check endpoint (no middleware)
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"musebar-pos"}`))
	})

	// Legal endpoints (with establishment middleware)
	mux.HandleFunc("GET /api/legal/journal/verify", middleware.InjectTestEstablishment(legalHandler.VerifyJournalIntegrity))
	mux.HandleFunc("GET /api/legal/journal/entries", middleware.InjectTestEstablishment(legalHandler.GetJournalEntries))
	mux.HandleFunc("GET /api/legal/journal/stats", middleware.InjectTestEstablishment(legalHandler.GetJournalStats))
	mux.HandleFunc("GET /api/legal/closure", middleware.InjectTestEstablishment(legalHandler.GetClosureBulletins))

	return mux
}
