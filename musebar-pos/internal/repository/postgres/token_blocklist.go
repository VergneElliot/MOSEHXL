package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type TokenBlocklistRepository struct {
	db *pgxpool.Pool
}

func NewTokenBlocklistRepository(db *pgxpool.Pool) *TokenBlocklistRepository {
	return &TokenBlocklistRepository{db: db}
}

// hashToken hashes a JWT token using SHA-256
func hashJWTToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// IsRevoked checks if a token has been revoked
// Checks both individual blocklist and user-level cutoff
func (r *TokenBlocklistRepository) IsRevoked(ctx context.Context, token string, userID int64, issuedAt int64) (bool, error) {
	tokenHash := hashJWTToken(token)

	// Check individual token blocklist
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM token_blocklist
			WHERE token_hash = $1
			  AND (expires_at IS NULL OR expires_at > NOW())
		)
	`, tokenHash).Scan(&exists)
	if err != nil {
		return false, err
	}
	if exists {
		return true, nil
	}

	// Check user-level revocation cutoff
	var revokeBeforeIat *int64
	err = r.db.QueryRow(ctx, `
		SELECT revoke_before_iat FROM user_token_revocation_cutoffs
		WHERE user_id = $1
	`, userID).Scan(&revokeBeforeIat)
	if err != nil {
		// No cutoff found - not revoked
		return false, nil
	}

	if revokeBeforeIat != nil && issuedAt < *revokeBeforeIat {
		return true, nil
	}

	return false, nil
}

// RevokeToken adds a token to the blocklist
func (r *TokenBlocklistRepository) RevokeToken(ctx context.Context, token string, userID int64, reason string, expiresAt *time.Time) error {
	tokenHash := hashJWTToken(token)
	_, err := r.db.Exec(ctx, `
		INSERT INTO token_blocklist (token_hash, user_id, reason, expires_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (token_hash) DO UPDATE
		SET reason = EXCLUDED.reason
	`, tokenHash, userID, reason, expiresAt)
	return err
}

// RevokeAllUserTokens revokes all tokens for a user issued before now
// Used for: password change, security breach, admin lockout
func (r *TokenBlocklistRepository) RevokeAllUserTokens(ctx context.Context, userID int64, reason string) error {
	now := time.Now().Unix()
	_, err := r.db.Exec(ctx, `
		INSERT INTO user_token_revocation_cutoffs (user_id, revoke_before_iat, reason, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (user_id) DO UPDATE
		SET revoke_before_iat = GREATEST(
			user_token_revocation_cutoffs.revoke_before_iat,
			EXCLUDED.revoke_before_iat
		),
		reason = EXCLUDED.reason,
		updated_at = NOW()
	`, userID, now, reason)
	return err
}

// CleanupExpired removes expired tokens from the blocklist (run periodically)
func (r *TokenBlocklistRepository) CleanupExpired(ctx context.Context) (int64, error) {
	result, err := r.db.Exec(ctx, `
		DELETE FROM token_blocklist
		WHERE expires_at IS NOT NULL AND expires_at < NOW()
	`)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
