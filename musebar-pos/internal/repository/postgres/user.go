package postgres

import (
	"context"
	"strings"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"musebar-pos/internal/models"
	"musebar-pos/internal/repository"
)

type UserRepositoryPostgres struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) repository.UserRepository {
	return &UserRepositoryPostgres{db: db}
}

// GetUserByEmail retrieves a user by email
func (r *UserRepositoryPostgres) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, first_name, last_name, role, 
		       establishment_id, is_active, google_id, avatar_url, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var user models.User
	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName,
		&user.Role, &user.EstablishmentID, &user.IsActive, &user.GoogleID, &user.AvatarURL,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// CreateUser creates a new user
func (r *UserRepositoryPostgres) CreateUser(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (email, password_hash, first_name, last_name, role, establishment_id, is_active, google_id, avatar_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`

	return r.db.QueryRow(ctx, query,
		user.Email, user.PasswordHash, user.FirstName, user.LastName,
		user.Role, user.EstablishmentID, user.IsActive, user.GoogleID, user.AvatarURL,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

// GetUserByID retrieves a user by ID
func (r *UserRepositoryPostgres) GetUserByID(ctx context.Context, userID int64) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, first_name, last_name, role,
		       establishment_id, is_active, google_id, avatar_url, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user models.User
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName,
		&user.Role, &user.EstablishmentID, &user.IsActive, &user.GoogleID, &user.AvatarURL,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// GetUsersByEstablishment retrieves all users for an establishment
func (r *UserRepositoryPostgres) GetUsersByEstablishment(ctx context.Context, establishmentID string) ([]models.User, error) {
	query := `
		SELECT id, email, password_hash, first_name, last_name, role,
		       establishment_id, is_active, created_at, updated_at
		FROM users
		WHERE establishment_id = $1
		ORDER BY email
	`

	rows, err := r.db.Query(ctx, query, establishmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName,
			&user.Role, &user.EstablishmentID, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

// UpdateUser updates user fields
func (r *UserRepositoryPostgres) UpdateUser(ctx context.Context, userID int64, updates map[string]interface{}) error {
	setClauses := []string{}
	args := []interface{}{}
	argIndex := 1

	for key, value := range updates {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIndex))
		args = append(args, value)
		argIndex++
	}

	if len(setClauses) == 0 {
		return fmt.Errorf("no fields to update")
	}

	args = append(args, userID)
	query := fmt.Sprintf(`
		UPDATE users
		SET %s
		WHERE id = $%d
	`, strings.Join(setClauses, ", "), argIndex)

	_, err := r.db.Exec(ctx, query, args...)
	return err
}

// DeleteUser deletes a user (soft delete by setting is_active = false)
func (r *UserRepositoryPostgres) DeleteUser(ctx context.Context, userID int64) error {
	query := `UPDATE users SET is_active = false WHERE id = $1`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

// GetUserByGoogleID retrieves a user by their Google ID
func (r *UserRepositoryPostgres) GetUserByGoogleID(ctx context.Context, googleID string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, first_name, last_name, role,
		       establishment_id, is_active, google_id, avatar_url, created_at, updated_at
		FROM users
		WHERE google_id = $1
	`

	var user models.User
	err := r.db.QueryRow(ctx, query, googleID).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName,
		&user.Role, &user.EstablishmentID, &user.IsActive, &user.GoogleID, &user.AvatarURL,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &user, nil
}
