package auth

import (
	"context"
	"net/http"
	"strings"
)

// RequireAuth middleware validates JWT token
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing authorization header", http.StatusUnauthorized)
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		token := parts[1]
		claims, err := ValidateToken(token)
		if err != nil {
			if err == ErrExpiredToken {
				http.Error(w, "Token expired", http.StatusUnauthorized)
			} else {
				http.Error(w, "Invalid token", http.StatusUnauthorized)
			}
			return
		}

		// For now, hardcode to test_001 schema since we only have one establishment
		// TODO: Later fetch from establishments table based on establishment_id
		schemaName := "establishment_test_001"

		// Add claims to context
		ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
		ctx = context.WithValue(ctx, "email", claims.Email)
		ctx = context.WithValue(ctx, "role", claims.Role)
		ctx = context.WithValue(ctx, "establishment_id", claims.EstablishmentID)
		ctx = context.WithValue(ctx, "schema_name", schemaName)

		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// RequireRole middleware checks for specific role
func RequireRole(role string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			userRole, ok := r.Context().Value("role").(string)
			if !ok || userRole != role {
				http.Error(w, "Insufficient permissions", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		}
	}
}

// RequireAdmin middleware checks for admin role
func RequireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return RequireRole("establishment_admin")(next)
}
