package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"musebar-pos/internal/domain/legal"
)

type ClosureHandler struct {
	closureService *legal.ClosureService
}

func NewClosureHandler(closureService *legal.ClosureService) *ClosureHandler {
	return &ClosureHandler{closureService: closureService}
}

// CreateDailyClosure generates a daily closure bulletin
func (h *ClosureHandler) CreateDailyClosure(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)
	establishmentID := r.Context().Value("establishment_id").(string)

	var req struct {
		Date         string  `json:"date"`          // YYYY-MM-DD
		FondDeCaisse float64 `json:"fond_de_caisse"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		http.Error(w, "Invalid date format (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	bulletin, err := h.closureService.CreateDailyClosure(r.Context(), schemaName, establishmentID, date, req.FondDeCaisse)
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

// CreateMonthlyClosure generates a monthly closure bulletin
func (h *ClosureHandler) CreateMonthlyClosure(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)
	establishmentID := r.Context().Value("establishment_id").(string)

	var req struct {
		Year         int     `json:"year"`
		Month        int     `json:"month"` // 1-12
		FondDeCaisse float64 `json:"fond_de_caisse"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Year < 2020 || req.Year > 2100 {
		http.Error(w, "Invalid year", http.StatusBadRequest)
		return
	}
	if req.Month < 1 || req.Month > 12 {
		http.Error(w, "Invalid month (1-12)", http.StatusBadRequest)
		return
	}

	bulletin, err := h.closureService.CreateMonthlyClosure(
		r.Context(), schemaName, establishmentID,
		req.Year, time.Month(req.Month), req.FondDeCaisse,
	)
	if err != nil {
		http.Error(w, "Failed to create monthly closure: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"bulletin": bulletin,
		"message":  "Monthly closure created successfully",
	})
}

// CreateAnnualClosure generates an annual closure bulletin
func (h *ClosureHandler) CreateAnnualClosure(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)
	establishmentID := r.Context().Value("establishment_id").(string)

	var req struct {
		Year         int     `json:"year"`
		FondDeCaisse float64 `json:"fond_de_caisse"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Year < 2020 || req.Year > 2100 {
		http.Error(w, "Invalid year", http.StatusBadRequest)
		return
	}

	bulletin, err := h.closureService.CreateAnnualClosure(
		r.Context(), schemaName, establishmentID,
		req.Year, req.FondDeCaisse,
	)
	if err != nil {
		http.Error(w, "Failed to create annual closure: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"bulletin": bulletin,
		"message":  "Annual closure created successfully",
	})
}

// GetClosures retrieves closure bulletins with filters
func (h *ClosureHandler) GetClosures(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)
	establishmentID := r.Context().Value("establishment_id").(string)

	closureType := r.URL.Query().Get("type")
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
		r.Context(), schemaName, establishmentID,
		closureTypePtr, startDate, endDate,
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

// unused import fix
var _ = strconv.Itoa
