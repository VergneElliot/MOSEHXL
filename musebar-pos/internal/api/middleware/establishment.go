package middleware

import (
	"context"
	"net/http"
)

// InjectTestEstablishment injects test establishment context for development
func InjectTestEstablishment(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// For now, use test establishment
		ctx := context.WithValue(r.Context(), "schema_name", "establishment_test_001")
		ctx = context.WithValue(ctx, "establishment_id", "test-establishment-id")
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}
