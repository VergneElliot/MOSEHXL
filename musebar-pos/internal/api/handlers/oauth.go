package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"musebar-pos/internal/config"
	"musebar-pos/internal/middleware/auth"
	"musebar-pos/internal/models"
	"musebar-pos/internal/repository"
	"musebar-pos/internal/repository/postgres"

	"golang.org/x/crypto/bcrypt"
)

// OAuthHandler handles Google OAuth flow
type OAuthHandler struct {
	cfg         *config.Config
	userRepo    repository.UserRepository
	refreshRepo *postgres.RefreshTokenRepository
}

func NewOAuthHandler(cfg *config.Config, userRepo repository.UserRepository, refreshRepo *postgres.RefreshTokenRepository) *OAuthHandler {
	return &OAuthHandler{
		cfg:         cfg,
		userRepo:    userRepo,
		refreshRepo: refreshRepo,
	}
}

// GoogleUserInfo represents the user info returned by Google
type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	VerifiedEmail bool   `json:"verified_email"`
}

// generateState generates a random state parameter for CSRF protection
func generateOAuthState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// GoogleLogin redirects to Google OAuth consent screen
func (h *OAuthHandler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	state, err := generateOAuthState()
	if err != nil {
		http.Error(w, "Failed to generate state", http.StatusInternalServerError)
		return
	}

	// Store state in cookie for CSRF validation
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cfg.Environment == "production",
		SameSite: http.SameSiteLaxMode,
		MaxAge:   600, // 10 minutes
	})

	// Build Google OAuth URL
	params := url.Values{
		"client_id":     {h.cfg.GoogleClientID},
		"redirect_uri":  {h.cfg.GoogleRedirectURL},
		"response_type": {"code"},
		"scope":         {"openid email profile"},
		"state":         {state},
		"access_type":   {"offline"},
		"prompt":        {"select_account"},
	}

	googleAuthURL := "https://accounts.google.com/o/oauth2/v2/auth?" + params.Encode()
	http.Redirect(w, r, googleAuthURL, http.StatusTemporaryRedirect)
}

// GoogleCallback handles the OAuth callback from Google
func (h *OAuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	// Validate state (CSRF protection)
	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || stateCookie.Value != r.URL.Query().Get("state") {
		h.redirectWithError(w, r, "invalid_state")
		return
	}

	// Clear state cookie
	http.SetCookie(w, &http.Cookie{
		Name:   "oauth_state",
		Value:  "",
		MaxAge: -1,
	})

	// Check for error from Google
	if errParam := r.URL.Query().Get("error"); errParam != "" {
		h.redirectWithError(w, r, errParam)
		return
	}

	// Exchange code for tokens
	code := r.URL.Query().Get("code")
	if code == "" {
		h.redirectWithError(w, r, "missing_code")
		return
	}

	googleToken, err := h.exchangeCodeForToken(r.Context(), code)
	if err != nil {
		h.redirectWithError(w, r, "token_exchange_failed")
		return
	}

	// Fetch user info from Google
	userInfo, err := h.fetchGoogleUserInfo(r.Context(), googleToken)
	if err != nil {
		h.redirectWithError(w, r, "userinfo_failed")
		return
	}

	if !userInfo.VerifiedEmail {
		h.redirectWithError(w, r, "email_not_verified")
		return
	}

	// Find or create user
	user, err := h.findOrCreateUser(r.Context(), userInfo)
	if err != nil {
		h.redirectWithError(w, r, "user_creation_failed")
		return
	}

	// Generate JWT
	establishmentID := ""
	if user.EstablishmentID != nil {
		establishmentID = *user.EstablishmentID
	}

	jwtToken, err := auth.GenerateToken(user.ID, user.Email, user.Role, establishmentID, false)
	if err != nil {
		h.redirectWithError(w, r, "token_generation_failed")
		return
	}

	// Generate refresh token
	rawRefreshToken, err := generateRawToken()
	if err != nil {
		h.redirectWithError(w, r, "refresh_token_failed")
		return
	}

	expiresAt := time.Now().Add(24 * time.Hour)
	ipAddr := r.RemoteAddr
	userAgent := r.UserAgent()
	if err := h.refreshRepo.Create(r.Context(), user.ID, rawRefreshToken, expiresAt, &ipAddr, &userAgent); err != nil {
		h.redirectWithError(w, r, "session_creation_failed")
		return
	}

	// Set refresh token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "musebar_refresh_token",
		Value:    rawRefreshToken,
		Path:     "/api/auth",
		HttpOnly: true,
		Secure:   h.cfg.Environment == "production",
		SameSite: http.SameSiteStrictMode,
		MaxAge:   86400,
	})

	// Redirect to frontend with JWT token
	frontendURL := fmt.Sprintf("%s/auth/callback?token=%s", h.cfg.FrontendURL, url.QueryEscape(jwtToken))
	http.Redirect(w, r, frontendURL, http.StatusTemporaryRedirect)
}

// exchangeCodeForToken exchanges the authorization code for Google tokens
func (h *OAuthHandler) exchangeCodeForToken(ctx context.Context, code string) (string, error) {
	params := url.Values{
		"code":          {code},
		"client_id":     {h.cfg.GoogleClientID},
		"client_secret": {h.cfg.GoogleClientSecret},
		"redirect_uri":  {h.cfg.GoogleRedirectURL},
		"grant_type":    {"authorization_code"},
	}

	resp, err := http.PostForm("https://oauth2.googleapis.com/token", params)
	if err != nil {
		return "", fmt.Errorf("token exchange request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read token response: %w", err)
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("failed to parse token response: %w", err)
	}
	if tokenResp.Error != "" {
		return "", fmt.Errorf("google token error: %s", tokenResp.Error)
	}

	return tokenResp.AccessToken, nil
}

// fetchGoogleUserInfo fetches user info from Google using the access token
func (h *OAuthHandler) fetchGoogleUserInfo(ctx context.Context, accessToken string) (*GoogleUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, "GET",
		"https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("userinfo request failed: %w", err)
	}
	defer resp.Body.Close()

	var userInfo GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to parse userinfo: %w", err)
	}

	return &userInfo, nil
}

// findOrCreateUser finds existing user or creates a new one
func (h *OAuthHandler) findOrCreateUser(ctx context.Context, info *GoogleUserInfo) (*models.User, error) {
	// Try to find by Google ID first
	user, err := h.userRepo.GetUserByGoogleID(ctx, info.ID)
	if err == nil {
		// Existing Google user - update avatar if changed
		h.userRepo.UpdateUser(ctx, user.ID, map[string]interface{}{
			"avatar_url": info.Picture,
		})
		return user, nil
	}

	// Try to find by email (link existing account)
	user, err = h.userRepo.GetUserByEmail(ctx, info.Email)
	if err == nil {
		// Link Google to existing account
		h.userRepo.UpdateUser(ctx, user.ID, map[string]interface{}{
			"google_id":  info.ID,
			"avatar_url": info.Picture,
		})
		return user, nil
	}

	// Create new user
	firstName := info.GivenName
	lastName := info.FamilyName
	if firstName == "" {
		firstName = info.Name
	}

	// Generate random password (user won't need it - they use Google)
	randomPwd := make([]byte, 16)
	rand.Read(randomPwd)
	hash, _ := bcrypt.GenerateFromPassword(randomPwd, bcrypt.DefaultCost)

	newUser := &models.User{
		Email:        info.Email,
		PasswordHash: string(hash),
		FirstName:    firstName,
		LastName:     lastName,
		Role:         "cashier", // Default role
		IsActive:     true,
		GoogleID:     &info.ID,
		AvatarURL:    &info.Picture,
	}

	if err := h.userRepo.CreateUser(ctx, newUser); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return newUser, nil
}

// redirectWithError redirects to frontend with error parameter
func (h *OAuthHandler) redirectWithError(w http.ResponseWriter, r *http.Request, errCode string) {
	redirectURL := fmt.Sprintf("%s/auth/callback?error=%s", h.cfg.FrontendURL, errCode)
	http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
}
