package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net"
	"net/http"
	"sync"
	"time"

	"musebar-pos/internal/middleware/auth"
	"musebar-pos/internal/repository"
	"musebar-pos/internal/validation"
	"musebar-pos/internal/repository/postgres"

	"golang.org/x/crypto/bcrypt"
)

// Simple in-memory rate limiter for login attempts
type rateLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
	window   time.Duration
	max      int
}

func newRateLimiter(window time.Duration, max int) *rateLimiter {
	return &rateLimiter{
		attempts: make(map[string][]time.Time),
		window:   window,
		max:      max,
	}
}

func (rl *rateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	// Clean old attempts
	attempts := rl.attempts[key]
	valid := attempts[:0]
	for _, t := range attempts {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= rl.max {
		rl.attempts[key] = valid
		return false
	}

	rl.attempts[key] = append(valid, now)
	return true
}

// Global rate limiters
var (
	loginLimiter   = newRateLimiter(15*time.Minute, 10)
	refreshLimiter = newRateLimiter(15*time.Minute, 30)
)

type AuthHandler struct {
	userRepo    repository.UserRepository
	refreshRepo *postgres.RefreshTokenRepository
}

func NewAuthHandler(userRepo repository.UserRepository, refreshRepo *postgres.RefreshTokenRepository) *AuthHandler {
	return &AuthHandler{
		userRepo:    userRepo,
		refreshRepo: refreshRepo,
	}
}

// generateRawToken generates a cryptographically secure random token
func generateRawToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// Login authenticates a user and returns JWT + refresh token
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	// Rate limiting by IP
	ip := r.RemoteAddr
	if host, _, err := net.SplitHostPort(ip); err == nil {
		ip = host
	}
	if !loginLimiter.Allow(ip) {
		http.Error(w, "Too many login attempts. Please retry later.", http.StatusTooManyRequests)
		return
	}

	body, err := validation.ReadBody(r)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	req, verr := validation.ValidateLogin(body)
	if verr != nil {
		validation.WriteValidationError(w, verr)
		return
	}

	// Find user by email
	user, err := h.userRepo.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	if !user.IsActive {
		http.Error(w, "Account is inactive", http.StatusForbidden)
		return
	}

	// Generate JWT access token (15min)
	establishmentID := ""
	if user.EstablishmentID != nil {
		establishmentID = *user.EstablishmentID
	}

	token, err := auth.GenerateToken(user.ID, user.Email, user.Role, establishmentID, req.RememberMe)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Generate opaque refresh token
	rawRefreshToken, err := generateRawToken()
	if err != nil {
		http.Error(w, "Failed to generate refresh token", http.StatusInternalServerError)
		return
	}

	// Store refresh token
	refreshExpiry := 24 * time.Hour
	if req.RememberMe {
		refreshExpiry = 7 * 24 * time.Hour
	}
	expiresAt := time.Now().Add(refreshExpiry)

	ipAddr := r.RemoteAddr
	userAgent := r.UserAgent()
	if err := h.refreshRepo.Create(r.Context(), user.ID, rawRefreshToken, expiresAt, &ipAddr, &userAgent); err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Set refresh token as HttpOnly cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "musebar_refresh_token",
		Value:    rawRefreshToken,
		Path:     "/api/auth",
		HttpOnly: true,
		Secure:   false, // true in production
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(refreshExpiry.Seconds()),
	})

	refreshExpiresIn := "1d"
	if req.RememberMe {
		refreshExpiresIn = "7d"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": token,
		"user": map[string]interface{}{
			"id":               user.ID,
			"email":            user.Email,
			"first_name":       user.FirstName,
			"last_name":        user.LastName,
			"role":             user.Role,
			"establishment_id": user.EstablishmentID,
		},
		"expires_in":         "15m",
		"refresh_expires_in": refreshExpiresIn,
	})
}

// Refresh issues a new JWT using a valid refresh token (with rotation)
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	// Rate limiting
	ip := r.RemoteAddr
	if host, _, err := net.SplitHostPort(ip); err == nil {
		ip = host
	}
	if !refreshLimiter.Allow(ip) {
		http.Error(w, "Too many refresh attempts. Please retry later.", http.StatusTooManyRequests)
		return
	}

	// Get refresh token from cookie or body
	rawToken := ""
	if cookie, err := r.Cookie("musebar_refresh_token"); err == nil {
		rawToken = cookie.Value
	}
	if rawToken == "" {
		var body struct {
			RefreshToken string `json:"refreshToken"`
		}
		json.NewDecoder(r.Body).Decode(&body)
		rawToken = body.RefreshToken
	}

	if rawToken == "" {
		http.Error(w, "Refresh token is required", http.StatusBadRequest)
		return
	}

	// Find active refresh token
	session, err := h.refreshRepo.FindActive(r.Context(), rawToken)
	if err != nil {
		http.Error(w, "Invalid or expired refresh token", http.StatusUnauthorized)
		return
	}

	// Get fresh user data
	user, err := h.userRepo.GetUserByID(r.Context(), session.UserID)
	if err != nil || !user.IsActive {
		http.Error(w, "User not found or inactive", http.StatusUnauthorized)
		return
	}

	// Generate new JWT
	establishmentID := ""
	if user.EstablishmentID != nil {
		establishmentID = *user.EstablishmentID
	}

	newToken, err := auth.GenerateToken(user.ID, user.Email, user.Role, establishmentID, false)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Rotate refresh token
	newRawRefreshToken, err := generateRawToken()
	if err != nil {
		http.Error(w, "Failed to generate refresh token", http.StatusInternalServerError)
		return
	}

	expiresAt := time.Now().Add(24 * time.Hour)
	ipAddr := r.RemoteAddr
	userAgent := r.UserAgent()

	if err := h.refreshRepo.Rotate(r.Context(), rawToken, newRawRefreshToken, user.ID, session.FamilyID, expiresAt, &ipAddr, &userAgent); err != nil {
		http.Error(w, "Failed to rotate session", http.StatusInternalServerError)
		return
	}

	// Set new refresh token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "musebar_refresh_token",
		Value:    newRawRefreshToken,
		Path:     "/api/auth",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   86400,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token":      newToken,
		"expires_in": "15m",
	})
}

// Logout revokes the refresh token and clears cookie
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie("musebar_refresh_token"); err == nil {
		h.refreshRepo.RevokeByRawToken(r.Context(), cookie.Value, "LOGOUT")
	}

	// Clear cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "musebar_refresh_token",
		Path:     "/api/auth",
		HttpOnly: true,
		MaxAge:   -1,
	})

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"message": "Logged out successfully"}`))
}

// Me returns current user info from JWT context
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(int64)
	email := r.Context().Value("email").(string)
	role := r.Context().Value("role").(string)
	establishmentID := r.Context().Value("establishment_id").(string)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":               userID,
		"email":            email,
		"role":             role,
		"establishment_id": establishmentID,
	})
}
