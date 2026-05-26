package validation

import (
	"encoding/json"
	"io"
	"net/http"
)

// WriteValidationError writes a 400 response with validation errors as JSON
func WriteValidationError(w http.ResponseWriter, v *ValidationError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error":  "Erreurs de validation",
		"errors": v.Errors,
	})
}

// ReadBody reads request body and returns raw JSON
func ReadBody(r *http.Request) (json.RawMessage, error) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // 1MB limit
	if err != nil {
		return nil, err
	}
	return json.RawMessage(body), nil
}
