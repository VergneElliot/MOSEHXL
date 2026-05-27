package logger

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// generateRequestID creates a unique request ID
func generateRequestID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// RequestLogger middleware logs HTTP requests with timing and request ID
func RequestLogger(l *Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			requestID := generateRequestID()

			// Inject request ID into context
			ctx := context.WithValue(r.Context(), RequestIDKey, requestID)
			r = r.WithContext(ctx)

			// Add request ID to response headers
			w.Header().Set("X-Request-ID", requestID)

			// Wrap response writer to capture status code
			rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

			// Process request
			next.ServeHTTP(rw, r)

			// Skip health check logging to reduce noise
			if strings.HasPrefix(r.URL.Path, "/api/health") {
				return
			}

			// Extract user ID if available
			userID := ""
			if uid, ok := r.Context().Value("user_id").(int64); ok && uid != 0 {
				userID = fmt.Sprintf("%d", uid)
			}

			// Get real IP (handle proxies)
			ip := r.RemoteAddr
			if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
				ip = strings.Split(forwarded, ",")[0]
			} else if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
				ip = realIP
			}

			l.HTTP(LogEntry{
				RequestID:  requestID,
				Method:     r.Method,
				Path:       r.URL.Path,
				StatusCode: rw.statusCode,
				Duration:   time.Since(start).String(),
				IP:         ip,
				UserID:     userID,
			})
		})
	}
}
