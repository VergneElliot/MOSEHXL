package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"runtime"
	"time"

	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Version info - set at build time via ldflags
var (
	Version   = "1.0.0"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

type HealthHandler struct {
	db        *pgxpool.Pool
	startTime time.Time
}

func NewHealthHandler(db *pgxpool.Pool) *HealthHandler {
	return &HealthHandler{
		db:        db,
		startTime: time.Now(),
	}
}

type HealthResponse struct {
	Status    string            `json:"status"`  // "ok" or "degraded"
	Version   string            `json:"version"`
	Uptime    string            `json:"uptime"`
	Timestamp string            `json:"timestamp"`
	Checks    map[string]Check  `json:"checks"`
	Build     BuildInfo         `json:"build"`
	Runtime   RuntimeInfo       `json:"runtime"`
}

type Check struct {
	Status  string `json:"status"`  // "ok" or "error"
	Message string `json:"message,omitempty"`
	Latency string `json:"latency,omitempty"`
}

type BuildInfo struct {
	Version   string `json:"version"`
	GitCommit string `json:"git_commit"`
	BuildTime string `json:"build_time"`
}

type RuntimeInfo struct {
	GoVersion  string `json:"go_version"`
	Goroutines int    `json:"goroutines"`
	MemAllocMB float64 `json:"mem_alloc_mb"`
}

// Health returns detailed health status
func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	checks := make(map[string]Check)
	overallStatus := "ok"

	// Check DB connectivity
	dbStart := time.Now()
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	err := h.db.Ping(ctx)
	dbLatency := time.Since(dbStart)

	if err != nil {
		checks["database"] = Check{
			Status:  "error",
			Message: "Database unreachable",
			Latency: dbLatency.String(),
		}
		overallStatus = "degraded"
	} else {
		// Also check pool stats
		stats := h.db.Stat()
		checks["database"] = Check{
			Status:  "ok",
			Message: fmt.Sprintf("connections: %d/%d", stats.AcquiredConns(), stats.TotalConns()),
			Latency: dbLatency.String(),
		}
	}

	// Memory stats
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	response := HealthResponse{
		Status:    overallStatus,
		Version:   Version,
		Uptime:    time.Since(h.startTime).Round(time.Second).String(),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Checks:    checks,
		Build: BuildInfo{
			Version:   Version,
			GitCommit: GitCommit,
			BuildTime: BuildTime,
		},
		Runtime: RuntimeInfo{
			GoVersion:  runtime.Version(),
			Goroutines: runtime.NumGoroutine(),
			MemAllocMB: float64(memStats.Alloc) / 1024 / 1024,
		},
	}

	statusCode := http.StatusOK
	if overallStatus == "degraded" {
		statusCode = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}

// Ready is a lightweight readiness check for load balancers
func (h *HealthHandler) Ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 1*time.Second)
	defer cancel()

	if err := h.db.Ping(ctx); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(`{"status":"not_ready"}`))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ready"}`))
}

// Live is a minimal liveness check (just returns 200)
func (h *HealthHandler) Live(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"alive"}`))
}
