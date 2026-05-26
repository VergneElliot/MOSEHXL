package auth

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	jwtSecret []byte
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token expired")
)

func init() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" || len(secret) < 32 {
		panic("JWT_SECRET environment variable is required and must be at least 32 characters")
	}
	jwtSecret = []byte(secret)
}

// Claims represents JWT claims
type Claims struct {
	UserID          int64  `json:"id"`
	Email           string `json:"email"`
	Role            string `json:"role"`
	EstablishmentID string `json:"establishment_id"`
	jwt.RegisteredClaims
}

// GenerateToken creates a new JWT token
func GenerateToken(userID int64, email, role, establishmentID string, rememberMe bool) (string, error) {
	expirationTime := time.Now().Add(15 * time.Minute)
	if rememberMe {
		expirationTime = time.Now().Add(7 * 24 * time.Hour)
	}

	claims := &Claims{
		UserID:          userID,
		Email:           email,
		Role:            role,
		EstablishmentID: establishmentID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "musebar-pos",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateToken validates and parses a JWT token
func ValidateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	if !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// RefreshToken generates a new token from an existing valid token
func RefreshToken(tokenString string) (string, error) {
	claims, err := ValidateToken(tokenString)
	if err != nil && !errors.Is(err, ErrExpiredToken) {
		return "", err
	}

	// Generate new token with same claims but fresh expiration
	return GenerateToken(claims.UserID, claims.Email, claims.Role, claims.EstablishmentID, false)
}
