package main

import (
	"context"
	"fmt"
	"musebar-pos/internal/config"
)

func main() {
	cfg, _ := config.Load()
	db, _ := config.InitDB(cfg)
	defer db.Close()

	var dbName string
	db.QueryRow(context.Background(), "SELECT current_database()").Scan(&dbName)
	fmt.Printf("Go is connected to database: %s\n", dbName)
	fmt.Printf("Config says database: %s\n", cfg.DatabaseName)
	
	fmt.Printf("\nConnection details:\n")
	fmt.Printf("  Host: %s\n", cfg.DatabaseHost)
	fmt.Printf("  Port: %s\n", cfg.DatabasePort)
	fmt.Printf("  User: %s\n", cfg.DatabaseUser)
	fmt.Printf("  Database: %s\n", cfg.DatabaseName)
}
