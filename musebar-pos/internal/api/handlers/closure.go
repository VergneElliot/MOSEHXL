package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"musebar-pos/internal/domain/legal"
)

type ClosureHandler struct {
	closureService *legal.ClosureService
}

func NewClosureHandler(closureService *legal.ClosureService) *ClosureHandler {
	return &ClosureHandler{closureService: closureService}
}

// CreateDailyClosureRequest represents a daily closure request
type CreateDailyClosureRequest struct {
	Date         string  `json:"date"` // YYYY-MM-DD
	FondDeCaisse float64 `json:"fond_de_caisse"` // Cash float left in register
}

// CreateDailyClosure generates a daily closure bulletin
func (h *ClosureHandler) CreateDailyClosure(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)
	establishmentID := r.Context().Value("establishment_id").(string)

	var req CreateDailyClosureRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Parse date
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		http.Error(w, "Invalid date format (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	// Create daily closure
	bulletin, err := h.closureService.CreateDailyClosure(
		r.Context(),
		schemaName,
		establishmentID,
		date,
		req.FondDeCaisse,
	)

	if err != nil {
		http.Error(w, "Failed to create closure: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"bulletin": bulletin,
		"message":  "Daily closure created successfully",
	})
}

// GetClosures retrieves closure bulletins with filters
func (h *ClosureHandler) GetClosures(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)
	establishmentID := r.Context().Value("establishment_id").(string)

	// Parse query parameters
	closureType := r.URL.Query().Get("type") // DAILY, MONTHLY, ANNUAL
	startDateStr := r.URL.Query().Get("start_date")
	endDateStr := r.URL.Query().Get("end_date")

	var closureTypePtr *string
	if closureType != "" {
		closureTypePtr = &closureType
	}

	var startDate, endDate *time.Time
	if startDateStr != "" {
		t, err := time.Parse("2006-01-02", startDateStr)
		if err == nil {
			startDate = &t
		}
	}
	if endDateStr != "" {
		t, err := time.Parse("2006-01-02", endDateStr)
		if err == nil {
			endDate = &t
		}
	}

	bulletins, err := h.closureService.GetClosureBulletins(
		r.Context(),
		schemaName,
		establishmentID,
		closureTypePtr,
		startDate,
		endDate,
	)

	if err != nil {
		http.Error(w, "Failed to retrieve closures", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"closures": bulletins,
		"total":    len(bulletins),
	})
}

// GetClosure retrieves a specific closure bulletin
func (h *ClosureHandler) GetClosure(w http.ResponseWriter, r *http.Request) {
	// Since we're using the legal handler's GetClosureBulletins endpoint,
	// this is a placeholder for future individual bulletin retrieval
	http.Error(w, "Not implemented", http.StatusNotImplemented)
}
