package handlers

import (
	"encoding/json"
	"net/http"

	"musebar-pos/internal/middleware/auth"
	"musebar-pos/internal/repository"
	
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo repository.UserRepository
}

func NewAuthHandler(userRepo repository.UserRepository) *AuthHandler {
	return &AuthHandler{userRepo: userRepo}
}

// LoginRequest represents login credentials
type LoginRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	RememberMe bool   `json:"remember_me"`
}

// LoginResponse represents login response
type LoginResponse struct {
	Token string      `json:"token"`
	User  interface{} `json:"user"`
}

// Login authenticates a user and returns a JWT token
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
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

	// Check if user is active
	if !user.IsActive {
		http.Error(w, "Account is inactive", http.StatusForbidden)
		return
	}

	// Generate JWT token
	establishmentID := ""
	if user.EstablishmentID != nil {
		establishmentID = *user.EstablishmentID
	}

	token, err := auth.GenerateToken(user.ID, user.Email, user.Role, establishmentID, req.RememberMe)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Return token and user info (without password hash)
	response := LoginResponse{
		Token: token,
		User: map[string]interface{}{
			"id":               user.ID,
			"email":            user.Email,
			"first_name":       user.FirstName,
			"last_name":        user.LastName,
			"role":             user.Role,
			"establishment_id": user.EstablishmentID,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Logout handler (client-side token deletion)
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// In a stateless JWT system, logout is handled client-side by deleting the token
	// For enhanced security, we could implement a token blocklist
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Logged out successfully"}`))
}

// Me returns current user info
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(int64)
	email := r.Context().Value("email").(string)
	role := r.Context().Value("role").(string)
	establishmentID := r.Context().Value("establishment_id").(string)

	user := map[string]interface{}{
		"id":               userID,
		"email":            email,
		"role":             role,
		"establishment_id": establishmentID,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}
