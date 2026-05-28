package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"musebar-pos/internal/models"
	"musebar-pos/internal/pkg/audit"
	"musebar-pos/internal/repository"
	"musebar-pos/internal/validation"

	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	userRepo     repository.UserRepository
	auditService *audit.Service
}

func NewUserHandler(userRepo repository.UserRepository, auditService *audit.Service) *UserHandler {
	return &UserHandler{userRepo: userRepo, auditService: auditService}
}

var allowedRoles = []string{"establishment_admin", "manager", "cashier"}

// ListUsers returns all users for the establishment (admin only)
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	establishmentID := r.Context().Value("establishment_id").(string)

	users, err := h.userRepo.GetUsersByEstablishment(r.Context(), establishmentID)
	if err != nil {
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}

	// Strip password hashes from response
	type SafeUser struct {
		ID              int64   `json:"id"`
		Email           string  `json:"email"`
		FirstName       string  `json:"first_name"`
		LastName        string  `json:"last_name"`
		Role            string  `json:"role"`
		EstablishmentID *string `json:"establishment_id"`
		IsActive        bool    `json:"is_active"`
		AvatarURL       *string `json:"avatar_url,omitempty"`
		GoogleID        *string `json:"has_google,omitempty"`
	}

	safeUsers := make([]SafeUser, len(users))
	for i, u := range users {
		hasGoogle := (*string)(nil)
		if u.GoogleID != nil {
			linked := "linked"
			hasGoogle = &linked
		}
		safeUsers[i] = SafeUser{
			ID:              u.ID,
			Email:           u.Email,
			FirstName:       u.FirstName,
			LastName:        u.LastName,
			Role:            u.Role,
			EstablishmentID: u.EstablishmentID,
			IsActive:        u.IsActive,
			AvatarURL:       u.AvatarURL,
			GoogleID:        hasGoogle,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"users": safeUsers,
		"total": len(safeUsers),
	})
}

// CreateUser creates a new user within the establishment (admin only)
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	establishmentID := r.Context().Value("establishment_id").(string)

	var req struct {
		Email     string `json:"email"`
		Password  string `json:"password"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Role      string `json:"role"`
	}

	body, err := validation.ReadBody(r)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate
	v := validation.NewValidator()
	validation.RequireEmail(v, "email", req.Email)
	validation.RequireString(v, "password", req.Password, 8, 128)
	validation.RequireString(v, "first_name", req.FirstName, 1, 100)
	validation.RequireString(v, "last_name", req.LastName, 1, 100)
	validation.RequireEnum(v, "role", req.Role, allowedRoles)
	if v.HasErrors() {
		validation.WriteValidationError(w, v)
		return
	}

	// Check email not already taken
	existing, _ := h.userRepo.GetUserByEmail(r.Context(), req.Email)
	if existing != nil {
		http.Error(w, "Email already in use", http.StatusConflict)
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to process password", http.StatusInternalServerError)
		return
	}

	estID := establishmentID
	user := &models.User{
		Email:           req.Email,
		PasswordHash:    string(hash),
		FirstName:       req.FirstName,
		LastName:        req.LastName,
		Role:            req.Role,
		EstablishmentID: &estID,
		IsActive:        true,
	}

	if err := h.userRepo.CreateUser(r.Context(), user); err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	h.auditService.Log(r.Context(), audit.Entry{
		UserID:          fmt.Sprintf("%d", r.Context().Value("user_id").(int64)),
		EstablishmentID: establishmentID,
		ActionType:      audit.ActionCreateUser,
		ResourceType:    "USER",
		IPAddress:       r.RemoteAddr,
		ActionDetails:   map[string]interface{}{"email": req.Email, "role": req.Role},
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"email":            req.Email,
		"first_name":       req.FirstName,
		"last_name":        req.LastName,
		"role":             req.Role,
		"establishment_id": establishmentID,
		"message":          "User created successfully",
	})
}

// UpdateUser updates user role or active status (admin only)
func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	establishmentID := r.Context().Value("establishment_id").(string)
	currentUserID := r.Context().Value("user_id").(int64)

	idStr := r.PathValue("id")
	targetID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Can't modify yourself
	if targetID == currentUserID {
		http.Error(w, "Cannot modify your own account", http.StatusBadRequest)
		return
	}

	// Verify user belongs to establishment
	target, err := h.userRepo.GetUserByID(r.Context(), targetID)
	if err != nil || target.EstablishmentID == nil || *target.EstablishmentID != establishmentID {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var req struct {
		Role     *string `json:"role"`
		IsActive *bool   `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	updates := map[string]interface{}{}

	if req.Role != nil {
		v := validation.NewValidator()
		validation.RequireEnum(v, "role", *req.Role, allowedRoles)
		if v.HasErrors() {
			validation.WriteValidationError(w, v)
			return
		}
		updates["role"] = *req.Role
	}

	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	if err := h.userRepo.UpdateUser(r.Context(), targetID, updates); err != nil {
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "User updated successfully",
		"user_id": targetID,
		"updates": updates,
	})
}

// DeactivateUser soft-deletes a user (admin only)
func (h *UserHandler) DeactivateUser(w http.ResponseWriter, r *http.Request) {
	establishmentID := r.Context().Value("establishment_id").(string)
	currentUserID := r.Context().Value("user_id").(int64)

	idStr := r.PathValue("id")
	targetID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if targetID == currentUserID {
		http.Error(w, "Cannot deactivate your own account", http.StatusBadRequest)
		return
	}

	target, err := h.userRepo.GetUserByID(r.Context(), targetID)
	if err != nil || target.EstablishmentID == nil || *target.EstablishmentID != establishmentID {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if err := h.userRepo.DeleteUser(r.Context(), targetID); err != nil {
		http.Error(w, "Failed to deactivate user", http.StatusInternalServerError)
		return
	}

	h.auditService.Log(r.Context(), audit.Entry{
		UserID:          fmt.Sprintf("%d", currentUserID),
		EstablishmentID: establishmentID,
		ActionType:      audit.ActionDeactivateUser,
		ResourceType:    "USER",
		ResourceID:      fmt.Sprintf("%d", targetID),
		IPAddress:       r.RemoteAddr,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "User deactivated successfully",
		"user_id": targetID,
	})
}

// ChangePassword allows a user to change their own password
func (h *UserHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	currentUserID := r.Context().Value("user_id").(int64)

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	v := validation.NewValidator()
	validation.RequireString(v, "current_password", req.CurrentPassword, 1, 128)
	validation.RequireString(v, "new_password", req.NewPassword, 8, 128)
	if v.HasErrors() {
		validation.WriteValidationError(w, v)
		return
	}

	user, err := h.userRepo.GetUserByID(r.Context(), currentUserID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		http.Error(w, "Current password is incorrect", http.StatusUnauthorized)
		return
	}

	// Hash new password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to process password", http.StatusInternalServerError)
		return
	}

	if err := h.userRepo.UpdateUser(r.Context(), currentUserID, map[string]interface{}{
		"password_hash": string(hash),
	}); err != nil {
		http.Error(w, "Failed to update password", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Password changed successfully",
	})
}


