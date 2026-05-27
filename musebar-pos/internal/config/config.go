package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Environment  string
	Port         string
	DatabaseHost string
	DatabasePort string
	DatabaseName string
	DatabaseUser string
	DatabasePass string
	JWTSecret    string
	CORSOrigins        []string // multiple origins supported
	ArchiveKey         string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	FrontendURL        string
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	_ = godotenv.Load()

	// Parse CORS_ORIGIN - comma-separated list
	corsRaw := getEnv("CORS_ORIGIN", "http://localhost:3000,http://localhost:5173")
	corsOrigins := []string{}
	for _, origin := range strings.Split(corsRaw, ",") {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			corsOrigins = append(corsOrigins, origin)
		}
	}

	cfg := &Config{
		Environment:  getEnv("NODE_ENV", "development"),
		Port:         getEnv("PORT", "3002"),
		DatabaseHost: getEnv("DB_HOST", "localhost"),
		DatabasePort: getEnv("DB_PORT", "5432"),
		DatabaseName: getEnv("DB_NAME", "restaurant_pos_development"),
		DatabaseUser: getEnv("DB_USER", "student"),
		DatabasePass: getEnv("DB_PASSWORD", ""),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		CORSOrigins:        corsOrigins,
		ArchiveKey:         os.Getenv("ARCHIVE_SECRET_KEY"),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:3002/api/auth/google/callback"),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:5173"),
	}

	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}
	if cfg.Environment == "production" && cfg.ArchiveKey == "" {
		return nil, fmt.Errorf("ARCHIVE_SECRET_KEY is required in production")
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
