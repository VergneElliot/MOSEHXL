package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"musebar-pos/internal/domain/legal"
	"musebar-pos/internal/repository"
)

type LegalHandler struct {
	journalService *legal.JournalService
	legalRepo      repository.LegalRepository
}

func NewLegalHandler(journalService *legal.JournalService, legalRepo repository.LegalRepository) *LegalHandler {
	return &LegalHandler{
		journalService: journalService,
		legalRepo:      legalRepo,
	}
}

// VerifyJournalIntegrity - GET /api/legal/journal/verify
func (h *LegalHandler) VerifyJournalIntegrity(w http.ResponseWriter, r *http.Request) {
	// Get schema name from context (set by establishment middleware)
	schemaName := r.Context().Value("schema_name").(string)

	isValid, err := h.journalService.VerifyChainIntegrity(r.Context(), schemaName)
	
	var errors []string
	if err != nil {
		errors = []string{err.Error()}
		isValid = false
	}

	status := "VALID"
	if !isValid {
		status = "COMPROMISED"
	}

	response := map[string]interface{}{
		"integrity_status": status,
		"errors":           errors,
		"verified_at":      time.Now().UTC().Format(time.RFC3339),
		"compliance":       "Article 286-I-3 bis du CGI",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetJournalEntries - GET /api/legal/journal/entries
func (h *LegalHandler) GetJournalEntries(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	// Parse query parameters
	startDateStr := r.URL.Query().Get("start_date")
	endDateStr := r.URL.Query().Get("end_date")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 100
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	offset := 0
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil {
			offset = o
		}
	}

	var startDate, endDate *time.Time
	if startDateStr != "" {
		if t, err := time.Parse(time.RFC3339, startDateStr); err == nil {
			startDate = &t
		}
	}
	if endDateStr != "" {
		if t, err := time.Parse(time.RFC3339, endDateStr); err == nil {
			endDate = &t
		}
	}

	// Get entries
	entries, err := h.journalService.GetEntries(r.Context(), schemaName, startDate, endDate, nil, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch journal entries", http.StatusInternalServerError)
		return
	}

	// Get total count
	total, err := h.legalRepo.GetEntriesCount(r.Context(), schemaName, startDate, endDate, nil)
	if err != nil {
		http.Error(w, "Failed to count journal entries", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"entries":         entries,
		"total":           total,
		"limit":           limit,
		"offset":          offset,
		"compliance_note": "Journal entries are immutable per French fiscal law",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetJournalStats - GET /api/legal/journal/stats
func (h *LegalHandler) GetJournalStats(w http.ResponseWriter, r *http.Request) {
	schemaName := r.Context().Value("schema_name").(string)

	// Get all entries for statistics
	entries, err := h.legalRepo.GetAllEntries(r.Context(), schemaName)
	if err != nil {
		http.Error(w, "Failed to fetch journal statistics", http.StatusInternalServerError)
		return
	}

	// Calculate statistics
	stats := map[string]interface{}{
		"total_entries": len(entries),
		"types":         make(map[string]int),
		"total_amount":  0.0,
		"total_vat":     0.0,
	}

	typeCounts := make(map[string]int)
	var totalAmount, totalVAT float64

	for _, entry := range entries {
		typeCounts[entry.TransactionType]++
		totalAmount += entry.Amount
		totalVAT += entry.VATAmount
	}

	stats["types"] = typeCounts
	stats["total_amount"] = totalAmount
	stats["total_vat"] = totalVAT

	response := map[string]interface{}{
		"statistics":      stats,
		"compliance_note": "Journal statistics for regulatory reporting",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetClosureBulletins - GET /api/legal/closure
func (h *LegalHandler) GetClosureBulletins(w http.ResponseWriter, r *http.Request) {
	establishmentID := r.Context().Value("establishment_id").(string)

	bulletinType := r.URL.Query().Get("type")
	startDateStr := r.URL.Query().Get("start_date")
	endDateStr := r.URL.Query().Get("end_date")

	var bulletinTypePtr *string
	if bulletinType != "" {
		bulletinTypePtr = &bulletinType
	}

	var startDate, endDate *time.Time
	if startDateStr != "" {
		if t, err := time.Parse(time.RFC3339, startDateStr); err == nil {
			startDate = &t
		}
	}
	if endDateStr != "" {
		if t, err := time.Parse(time.RFC3339, endDateStr); err == nil {
			endDate = &t
		}
	}

	bulletins, err := h.legalRepo.GetClosureBulletins(r.Context(), establishmentID, bulletinTypePtr, startDate, endDate)
	if err != nil {
		http.Error(w, "Failed to fetch closure bulletins", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"bulletins": bulletins,
		"total":     len(bulletins),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
