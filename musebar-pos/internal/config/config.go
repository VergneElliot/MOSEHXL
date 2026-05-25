package config

import (
	"fmt"
	"os"

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
	CORSOrigin   string
	ArchiveKey   string
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if it exists (development)
	_ = godotenv.Load()

	cfg := &Config{
		Environment:  getEnv("NODE_ENV", "development"),
		Port:         getEnv("PORT", "3001"),
		DatabaseHost: getEnv("DB_HOST", "localhost"),
		DatabasePort: getEnv("DB_PORT", "5432"),
		DatabaseName: getEnv("DB_NAME", "mosehxl_development"),
		DatabaseUser: getEnv("DB_USER", "postgres"),
		DatabasePass: getEnv("DB_PASSWORD", ""),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		CORSOrigin:   getEnv("CORS_ORIGIN", "http://localhost:3000"),
		ArchiveKey:   os.Getenv("ARCHIVE_SECRET_KEY"),
	}

	// Validate required fields
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
