package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"musebar-pos/internal/config"
	"musebar-pos/internal/models"
	"musebar-pos/internal/pkg/email"
	"musebar-pos/internal/pkg/logger"
	"musebar-pos/internal/repository"
	"musebar-pos/internal/repository/postgres"
	"musebar-pos/internal/validation"

	bcrypt "golang.org/x/crypto/bcrypt"
)

type InvitationHandler struct {
	cfg         *config.Config
	userRepo    repository.UserRepository
	inviteRepo  *postgres.InvitationRepository
	emailSender email.EmailSender
}

func NewInvitationHandler(cfg *config.Config, userRepo repository.UserRepository, inviteRepo *postgres.InvitationRepository, emailSender email.EmailSender) *InvitationHandler {
	return &InvitationHandler{
		cfg:         cfg,
		userRepo:    userRepo,
		inviteRepo:  inviteRepo,
		emailSender: emailSender,
	}
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// --- Password Reset ---

// ForgotPassword sends a password reset email
func (h *InvitationHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Always return same message (prevent email enumeration)
	genericMsg := `{"message": "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."}`

	v := validation.NewValidator()
	validation.RequireEmail(v, "email", req.Email)
	if v.HasErrors() {
		validation.WriteValidationError(w, v)
		return
	}

	user, err := h.userRepo.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		// User not found - return generic message (don't reveal)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(genericMsg))
		return
	}

	// Generate token
	rawToken, tokenHash, err := postgres.GenerateSecureToken()
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	expiresAt := time.Now().Add(60 * time.Minute)
	ipAddr := r.RemoteAddr
	userAgent := r.UserAgent()

	if err := h.inviteRepo.CreatePasswordResetToken(r.Context(), user.ID, tokenHash, expiresAt, ipAddr, userAgent); err != nil {
		http.Error(w, "Failed to create reset token", http.StatusInternalServerError)
		return
	}

	// Send email
	resetURL := h.cfg.FrontendURL + "/reset-password?token=" + rawToken
	go func() {
		err := h.emailSender.SendTemplate(user.Email, "MuseBar POS - Réinitialisation de mot de passe",
			email.TemplatePasswordReset, map[string]interface{}{
				"FirstName": user.FirstName,
				"ResetURL":  resetURL,
			})
		if err != nil {
			logger.Error("Failed to send password reset email", err)
		}
	}()

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(genericMsg))
}

// ResetPassword resets password using a valid token
func (h *InvitationHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	v := validation.NewValidator()
	validation.RequireString(v, "token", req.Token, 1, 128)
	validation.RequireString(v, "new_password", req.NewPassword, 8, 128)
	if v.HasErrors() {
		validation.WriteValidationError(w, v)
		return
	}

	tokenHash := hashToken(req.Token)

	userID, err := h.inviteRepo.FindValidPasswordResetToken(r.Context(), tokenHash)
	if err != nil {
		http.Error(w, "Token invalide ou expiré", http.StatusBadRequest)
		return
	}

	// Hash new password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to process password", http.StatusInternalServerError)
		return
	}

	// Update password
	if err := h.userRepo.UpdateUser(r.Context(), userID, map[string]interface{}{
		"password_hash": string(hash),
	}); err != nil {
		http.Error(w, "Failed to update password", http.StatusInternalServerError)
		return
	}

	// Mark token as used
	h.inviteRepo.MarkPasswordResetTokenUsed(r.Context(), tokenHash)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Mot de passe réinitialisé avec succès",
	})
}

// --- Invitations ---

// InviteUser sends an invitation email to a new team member
func (h *InvitationHandler) InviteUser(w http.ResponseWriter, r *http.Request) {
	establishmentID := r.Context().Value("establishment_id").(string)
	inviterID := r.Context().Value("user_id").(int64)

	var req struct {
		Email     string `json:"email"`
		FirstName string `json:"first_name"`
		Role      string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	v := validation.NewValidator()
	validation.RequireEmail(v, "email", req.Email)
	validation.RequireString(v, "first_name", req.FirstName, 1, 100)
	validation.RequireEnum(v, "role", req.Role, []string{"establishment_admin", "manager", "cashier"})
	if v.HasErrors() {
		validation.WriteValidationError(w, v)
		return
	}

	// Check if user already exists
	existing, _ := h.userRepo.GetUserByEmail(r.Context(), req.Email)
	if existing != nil {
		http.Error(w, "Un compte existe déjà avec cet email", http.StatusConflict)
		return
	}

	// Get inviter info
	inviter, err := h.userRepo.GetUserByID(r.Context(), inviterID)
	if err != nil {
		http.Error(w, "Failed to get inviter info", http.StatusInternalServerError)
		return
	}

	// Generate token
	rawToken, tokenHash, err := postgres.GenerateSecureToken()
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	expiresAt := time.Now().Add(48 * time.Hour)

	if err := h.inviteRepo.CreateInvitation(r.Context(), tokenHash, req.Email, req.Role, establishmentID, inviterID, req.FirstName, expiresAt); err != nil {
		http.Error(w, "Failed to create invitation", http.StatusInternalServerError)
		return
	}

	// Send invitation email
	inviteURL := h.cfg.FrontendURL + "/accept-invite?token=" + rawToken
	inviterName := inviter.FirstName + " " + inviter.LastName

	go func() {
		err := h.emailSender.SendTemplate(req.Email, "MuseBar POS - Invitation",
			email.TemplateInvitation, map[string]interface{}{
				"FirstName":         req.FirstName,
				"InviterName":       inviterName,
				"EstablishmentName": "MuseBar",
				"Role":              req.Role,
				"InviteURL":         inviteURL,
			})
		if err != nil {
			logger.Error("Failed to send invitation email", err)
		}
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":    "Invitation envoyée avec succès",
		"email":      req.Email,
		"role":       req.Role,
		"expires_at": expiresAt,
	})
}

// AcceptInvitation accepts an invitation and creates a user account
func (h *InvitationHandler) AcceptInvitation(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token     string `json:"token"`
		Password  string `json:"password"`
		LastName  string `json:"last_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	v := validation.NewValidator()
	validation.RequireString(v, "token", req.Token, 1, 128)
	validation.RequireString(v, "password", req.Password, 8, 128)
	validation.RequireString(v, "last_name", req.LastName, 1, 100)
	if v.HasErrors() {
		validation.WriteValidationError(w, v)
		return
	}

	tokenHash := hashToken(req.Token)

	inv, err := h.inviteRepo.FindValidInvitation(r.Context(), tokenHash)
	if err != nil {
		http.Error(w, "Invitation invalide ou expirée", http.StatusBadRequest)
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to process password", http.StatusInternalServerError)
		return
	}

	// Create user
	estID := inv.EstablishmentID
	user := &models.User{
		Email:           inv.Email,
		PasswordHash:    string(hash),
		FirstName:       inv.FirstName,
		LastName:        req.LastName,
		Role:            inv.Role,
		EstablishmentID: &estID,
		IsActive:        true,
	}

	if err := h.userRepo.CreateUser(r.Context(), user); err != nil {
		http.Error(w, "Failed to create account", http.StatusInternalServerError)
		return
	}

	// Mark invitation as accepted
	h.inviteRepo.MarkInvitationAccepted(r.Context(), tokenHash)

	// Send welcome email
	go func() {
		h.emailSender.SendTemplate(inv.Email, "Bienvenue sur MuseBar POS !",
			email.TemplateWelcome, map[string]interface{}{
				"FirstName":         inv.FirstName,
				"EstablishmentName": "MuseBar",
				"LoginURL":          h.cfg.FrontendURL + "/login",
			})
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Compte créé avec succès",
		"email":   inv.Email,
	})
}

// GetInvitationInfo returns invitation details (for the accept page)
func (h *InvitationHandler) GetInvitationInfo(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "Token requis", http.StatusBadRequest)
		return
	}

	tokenHash := hashToken(token)
	inv, err := h.inviteRepo.FindValidInvitation(r.Context(), tokenHash)
	if err != nil {
		http.Error(w, "Invitation invalide ou expirée", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"email":      inv.Email,
		"first_name": inv.FirstName,
		"role":       inv.Role,
		"expires_at": inv.ExpiresAt,
	})
}
