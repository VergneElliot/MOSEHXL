package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type RefreshToken struct {
	ID                   string
	UserID               int64
	TokenHash            string
	FamilyID             string
	ExpiresAt            time.Time
	RevokedAt            *time.Time
	RevokeReason         *string
	ReplacedByTokenHash  *string
	IPAddress            *string
	UserAgent            *string
	CreatedAt            time.Time
}

type RefreshTokenRepository struct {
	db *pgxpool.Pool
}

func NewRefreshTokenRepository(db *pgxpool.Pool) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

// HashToken hashes a raw token using SHA-256
func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// Create stores a new refresh token
func (r *RefreshTokenRepository) Create(ctx context.Context, userID int64, rawToken string, expiresAt time.Time, ipAddress, userAgent *string) error {
	tokenHash := HashToken(rawToken)
	query := `
		INSERT INTO auth_refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.Exec(ctx, query, userID, tokenHash, expiresAt, ipAddress, userAgent)
	return err
}

// FindActive retrieves an active (non-revoked, non-expired) refresh token
func (r *RefreshTokenRepository) FindActive(ctx context.Context, rawToken string) (*RefreshToken, error) {
	tokenHash := HashToken(rawToken)
	query := `
		SELECT id, user_id, token_hash, family_id, expires_at,
		       revoked_at, revoke_reason, replaced_by_token_hash,
		       ip_address, user_agent, created_at
		FROM auth_refresh_tokens
		WHERE token_hash = $1
		  AND revoked_at IS NULL
		  AND expires_at > NOW()
	`

	var rt RefreshToken
	err := r.db.QueryRow(ctx, query, tokenHash).Scan(
		&rt.ID, &rt.UserID, &rt.TokenHash, &rt.FamilyID, &rt.ExpiresAt,
		&rt.RevokedAt, &rt.RevokeReason, &rt.ReplacedByTokenHash,
		&rt.IPAddress, &rt.UserAgent, &rt.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &rt, nil
}

// Rotate revokes old token and creates new one (token rotation)
func (r *RefreshTokenRepository) Rotate(ctx context.Context, oldRawToken, newRawToken string, userID int64, familyID string, expiresAt time.Time, ipAddress, userAgent *string) error {
	oldHash := HashToken(oldRawToken)
	newHash := HashToken(newRawToken)

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Revoke old token and point to new one
	_, err = tx.Exec(ctx, `
		UPDATE auth_refresh_tokens
		SET revoked_at = NOW(),
		    revoke_reason = 'ROTATED',
		    replaced_by_token_hash = $1
		WHERE token_hash = $2
	`, newHash, oldHash)
	if err != nil {
		return fmt.Errorf("failed to revoke old token: %w", err)
	}

	// Insert new token with same family
	_, err = tx.Exec(ctx, `
		INSERT INTO auth_refresh_tokens (user_id, token_hash, family_id, expires_at, ip_address, user_agent)
		VALUES ($1, $2, $3::uuid, $4, $5, $6)
	`, userID, newHash, familyID, expiresAt, ipAddress, userAgent)
	if err != nil {
		return fmt.Errorf("failed to insert new token: %w", err)
	}

	return tx.Commit(ctx)
}

// RevokeByRawToken revokes a specific token
func (r *RefreshTokenRepository) RevokeByRawToken(ctx context.Context, rawToken, reason string) error {
	tokenHash := HashToken(rawToken)
	_, err := r.db.Exec(ctx, `
		UPDATE auth_refresh_tokens
		SET revoked_at = NOW(), revoke_reason = $1
		WHERE token_hash = $2
	`, reason, tokenHash)
	return err
}

// RevokeFamily revokes all tokens in a family (detect token reuse attack)
func (r *RefreshTokenRepository) RevokeFamily(ctx context.Context, familyID, reason string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE auth_refresh_tokens
		SET revoked_at = NOW(), revoke_reason = $1
		WHERE family_id = $2::uuid AND revoked_at IS NULL
	`, reason, familyID)
	return err
}

// RevokeAllForUser revokes all tokens for a user (logout all devices)
func (r *RefreshTokenRepository) RevokeAllForUser(ctx context.Context, userID int64, reason string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE auth_refresh_tokens
		SET revoked_at = NOW(), revoke_reason = $1
		WHERE user_id = $2 AND revoked_at IS NULL
	`, reason, userID)
	return err
}
