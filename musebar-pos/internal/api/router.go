package api

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"musebar-pos/internal/config"
)

// NewRouter creates and configures the HTTP router
func NewRouter(cfg *config.Config, db *pgxpool.Pool) http.Handler {
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"musebar-pos"}`))
	})

	// TODO: Add legal handlers
	// TODO: Add auth middleware
	// TODO: Add CORS middleware
	// TODO: Add other endpoints

	return mux
}
