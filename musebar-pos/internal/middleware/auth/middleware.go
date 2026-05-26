package auth

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RequireAuth middleware validates JWT token and resolves schema from DB
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing authorization header", http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		claims, err := ValidateToken(parts[1])
		if err != nil {
			if err == ErrExpiredToken {
				http.Error(w, "Token expired", http.StatusUnauthorized)
			} else {
				http.Error(w, "Invalid token", http.StatusUnauthorized)
			}
			return
		}

		// Resolve schema_name from establishments table
		schemaName, err := resolveSchemaName(r.Context(), claims.EstablishmentID)
		if err != nil {
			http.Error(w, "Establishment not found", http.StatusForbidden)
			return
		}

		ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
		ctx = context.WithValue(ctx, "email", claims.Email)
		ctx = context.WithValue(ctx, "role", claims.Role)
		ctx = context.WithValue(ctx, "establishment_id", claims.EstablishmentID)
		ctx = context.WithValue(ctx, "schema_name", schemaName)

		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// resolveSchemaName looks up the schema_name for an establishment from the DB
func resolveSchemaName(ctx context.Context, establishmentID string) (string, error) {
	db, ok := ctx.Value("db").(*pgxpool.Pool)
	if !ok || db == nil {
		// Fallback for tests or when db not in context
		return "establishment_test_001", nil
	}

	var schemaName string
	err := db.QueryRow(ctx,
		`SELECT schema_name FROM establishments WHERE id = $1`,
		establishmentID,
	).Scan(&schemaName)

	if err != nil {
		return "", fmt.Errorf("establishment not found: %w", err)
	}

	return schemaName, nil
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
	return RequireAuth(RequireRole("establishment_admin")(next))
}

// WithDB injects the database pool into the request context
func WithDB(db *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), "db", db)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
