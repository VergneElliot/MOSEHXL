package postgres

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type InvitationRepository struct {
	db *pgxpool.Pool
}

func NewInvitationRepository(db *pgxpool.Pool) *InvitationRepository {
	return &InvitationRepository{db: db}
}

// GenerateToken creates a secure random token and returns raw + hash
func GenerateSecureToken() (raw string, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return
	}
	raw = hex.EncodeToString(b)
	h := sha256.Sum256([]byte(raw))
	hash = hex.EncodeToString(h[:])
	return
}

// --- Password Reset ---

// CreatePasswordResetToken stores a new password reset token
func (r *InvitationRepository) CreatePasswordResetToken(ctx context.Context, userID int64, tokenHash string, expiresAt time.Time, ipAddress, userAgent string) error {
	// Invalidate existing tokens first
	_, err := r.db.Exec(ctx, `
		UPDATE password_reset_tokens 
		SET used_at = NOW() 
		WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
	`, userID)
	if err != nil {
		return err
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5)
	`, userID, tokenHash, expiresAt, ipAddress, userAgent)
	return err
}

// FindValidPasswordResetToken finds an active reset token
func (r *InvitationRepository) FindValidPasswordResetToken(ctx context.Context, tokenHash string) (userID int64, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT user_id FROM password_reset_tokens
		WHERE token_hash = $1
		  AND used_at IS NULL
		  AND expires_at > NOW()
	`, tokenHash).Scan(&userID)
	return
}

// MarkPasswordResetTokenUsed marks a token as used
func (r *InvitationRepository) MarkPasswordResetTokenUsed(ctx context.Context, tokenHash string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE password_reset_tokens SET used_at = NOW()
		WHERE token_hash = $1
	`, tokenHash)
	return err
}

// --- Invitations ---

// CreateInvitation stores a new user invitation
func (r *InvitationRepository) CreateInvitation(ctx context.Context, tokenHash, email, role, establishmentID string, invitedBy int64, firstName string, expiresAt time.Time) error {
	// Invalidate existing pending invitations for this email+establishment
	_, err := r.db.Exec(ctx, `
		UPDATE user_invitations 
		SET accepted_at = NOW()
		WHERE email = $1 AND establishment_id = $2::uuid AND accepted_at IS NULL
	`, email, establishmentID)
	if err != nil {
		return err
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO user_invitations (token_hash, email, role, establishment_id, invited_by, first_name, expires_at)
		VALUES ($1, $2, $3, $4::uuid, $5, $6, $7)
	`, tokenHash, email, role, establishmentID, invitedBy, firstName, expiresAt)
	return err
}

type Invitation struct {
	ID              int64
	Email           string
	Role            string
	EstablishmentID string
	InvitedBy       int64
	FirstName       string
	ExpiresAt       time.Time
}

// FindValidInvitation finds an active invitation by token hash
func (r *InvitationRepository) FindValidInvitation(ctx context.Context, tokenHash string) (*Invitation, error) {
	inv := &Invitation{}
	err := r.db.QueryRow(ctx, `
		SELECT id, email, role, establishment_id, invited_by, COALESCE(first_name, ''), expires_at
		FROM user_invitations
		WHERE token_hash = $1
		  AND accepted_at IS NULL
		  AND expires_at > NOW()
	`, tokenHash).Scan(
		&inv.ID, &inv.Email, &inv.Role, &inv.EstablishmentID,
		&inv.InvitedBy, &inv.FirstName, &inv.ExpiresAt,
	)
	if err != nil {
		return nil, err
	}
	return inv, nil
}

// MarkInvitationAccepted marks an invitation as accepted
func (r *InvitationRepository) MarkInvitationAccepted(ctx context.Context, tokenHash string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE user_invitations SET accepted_at = NOW()
		WHERE token_hash = $1
	`, tokenHash)
	return err
}
