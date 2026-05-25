package config

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// InitDB initializes PostgreSQL connection pool using pgx
func InitDB(cfg *Config) (*pgxpool.Pool, error) {
	// Build connection string
	// If no password is set, use Unix socket (peer authentication)
	var connString string
	if cfg.DatabasePass == "" {
		// Peer authentication via Unix socket
		connString = fmt.Sprintf(
			"host=/var/run/postgresql user=%s dbname=%s sslmode=disable",
			cfg.DatabaseUser,
			cfg.DatabaseName,
		)
	} else {
		// TCP connection with password
		connString = fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			cfg.DatabaseHost,
			cfg.DatabasePort,
			cfg.DatabaseUser,
			cfg.DatabasePass,
			cfg.DatabaseName,
		)
	}

	// Create pool configuration
	poolConfig, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("unable to parse config: %w", err)
	}

	// Configure pool settings
	poolConfig.MaxConns = 25
	poolConfig.MinConns = 5

	// Create connection pool
	pool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	// Verify connection
	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	return pool, nil
}
