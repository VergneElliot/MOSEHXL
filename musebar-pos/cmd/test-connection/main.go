package main

import (
	"context"
	"fmt"
	"log"

	"musebar-pos/internal/config"
)

func main() {
	cfg, _ := config.Load()
	
	fmt.Printf("Connecting to: %s\n", cfg.DatabaseName)
	
	db, err := config.InitDB(cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	ctx := context.Background()

	// Test 1: Check search_path
	var searchPath string
	db.QueryRow(ctx, "SHOW search_path").Scan(&searchPath)
	fmt.Printf("Search path: %s\n\n", searchPath)

	// Test 2: List all tables Go can see
	rows, _ := db.Query(ctx, `
		SELECT schemaname, tablename 
		FROM pg_tables 
		WHERE schemaname = 'establishment_test_001'
		ORDER BY tablename
	`)
	defer rows.Close()

	fmt.Println("Tables Go can see in establishment_test_001:")
	for rows.Next() {
		var schema, table string
		rows.Scan(&schema, &table)
		fmt.Printf("  - %s.%s\n", schema, table)
	}

	// Test 3: Try to query the legal_journal table
	fmt.Println("\nTrying to query legal_journal:")
	var count int
	err = db.QueryRow(ctx, `SELECT COUNT(*) FROM establishment_test_001.legal_journal`).Scan(&count)
	
	if err != nil {
		fmt.Printf("  ERROR: %v\n", err)
	} else {
		fmt.Printf("  SUCCESS: %d rows\n", count)
	}
}
