package cors

import (
	"net/http"
	"strings"
)

// Config holds CORS configuration
type Config struct {
	AllowedOrigins []string
	IsDevelopment  bool
}

// Middleware returns a CORS middleware handler
func Middleware(cfg Config) func(http.Handler) http.Handler {
	// Development origins always allowed
	devOrigins := []string{
		"http://localhost:3000",
		"http://localhost:5173", // Vite default (Svelte)
		"http://localhost:4173", // Vite preview
		"http://127.0.0.1:3000",
		"http://127.0.0.1:5173",
	}

	allowedOrigins := cfg.AllowedOrigins
	if cfg.IsDevelopment {
		allowedOrigins = append(allowedOrigins, devOrigins...)
	}

	// Build a set for O(1) lookup
	originSet := make(map[string]bool)
	for _, o := range allowedOrigins {
		originSet[strings.TrimRight(o, "/")] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Allow non-browser requests (no Origin header)
			if origin == "" {
				next.ServeHTTP(w, r)
				return
			}

			// Check if origin is allowed
			allowed := originSet[strings.TrimRight(origin, "/")]

			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")
				w.Header().Set("Access-Control-Max-Age", "86400")
				w.Header().Set("Vary", "Origin")
			}

			// Handle preflight OPTIONS request
			if r.Method == http.MethodOptions {
				if allowed {
					w.WriteHeader(http.StatusNoContent)
				} else {
					w.WriteHeader(http.StatusForbidden)
				}
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
