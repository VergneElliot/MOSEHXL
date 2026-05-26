package validation

import (
	"fmt"
	"strings"
)

// ValidationError represents a collection of validation errors
type ValidationError struct {
	Errors []string `json:"errors"`
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation errors: %s", strings.Join(e.Errors, ", "))
}

func (e *ValidationError) HasErrors() bool {
	return len(e.Errors) > 0
}

func (e *ValidationError) Add(msg string) {
	e.Errors = append(e.Errors, msg)
}

// NewValidator creates a new validation error collector
func NewValidator() *ValidationError {
	return &ValidationError{Errors: []string{}}
}

// --- Reusable validation functions ---

// RequireString validates a required string field with min/max length
func RequireString(v *ValidationError, field, value string, min, max int) {
	value = strings.TrimSpace(value)
	if value == "" {
		v.Add(fmt.Sprintf("'%s' est requis", field))
		return
	}
	if len(value) < min {
		v.Add(fmt.Sprintf("'%s' doit contenir au moins %d caractères", field, min))
	}
	if len(value) > max {
		v.Add(fmt.Sprintf("'%s' ne doit pas dépasser %d caractères", field, max))
	}
}

// OptionalString validates an optional string field
func OptionalString(v *ValidationError, field, value string, max int) {
	if value == "" {
		return
	}
	if len(strings.TrimSpace(value)) > max {
		v.Add(fmt.Sprintf("'%s' ne doit pas dépasser %d caractères", field, max))
	}
}

// RequirePositiveFloat validates a required positive number
func RequirePositiveFloat(v *ValidationError, field string, value float64) {
	if value < 0 {
		v.Add(fmt.Sprintf("'%s' doit être un nombre positif", field))
	}
}

// RequirePositiveInt validates a required positive integer
func RequirePositiveInt(v *ValidationError, field string, value int) {
	if value <= 0 {
		v.Add(fmt.Sprintf("'%s' doit être un entier positif", field))
	}
}

// RequireEnum validates a value is one of allowed values
func RequireEnum(v *ValidationError, field, value string, allowed []string) {
	for _, a := range allowed {
		if strings.EqualFold(value, a) {
			return
		}
	}
	v.Add(fmt.Sprintf("'%s' doit être l'un des suivants: %s", field, strings.Join(allowed, ", ")))
}

// RequireEmail validates an email format
func RequireEmail(v *ValidationError, field, value string) {
	value = strings.TrimSpace(value)
	if value == "" {
		v.Add(fmt.Sprintf("'%s' est requis", field))
		return
	}
	if !strings.Contains(value, "@") || !strings.Contains(value, ".") {
		v.Add(fmt.Sprintf("'%s' doit être une adresse email valide", field))
	}
}

// RequireNonEmptySlice validates a slice has at least one element
func RequireNonEmptySlice(v *ValidationError, field string, length int) {
	if length == 0 {
		v.Add(fmt.Sprintf("'%s' doit contenir au moins un élément", field))
	}
}

// RequireRange validates a number is within a range
func RequireRange(v *ValidationError, field string, value, min, max float64) {
	if value < min || value > max {
		v.Add(fmt.Sprintf("'%s' doit être entre %.0f et %.0f", field, min, max))
	}
}

// RequireTaxRate validates French VAT rates (0, 5.5, 10, 20)
func RequireTaxRate(v *ValidationError, field string, value float64) {
	validRates := []float64{0, 5.5, 10, 20}
	for _, r := range validRates {
		if value == r {
			return
		}
	}
	v.Add(fmt.Sprintf("'%s' doit être un taux de TVA français valide (0, 5.5, 10, 20)", field))
}
