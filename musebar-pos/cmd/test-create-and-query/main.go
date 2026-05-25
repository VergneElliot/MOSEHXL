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

	ctx := context.Background()

	fmt.Println("Step 1: Drop table if exists...")
	_, err := db.Exec(ctx, "DROP TABLE IF EXISTS establishment_test_001.legal_journal CASCADE")
	if err != nil {
		fmt.Printf("Drop failed: %v\n", err)
	} else {
		fmt.Println("  ✓ Dropped")
	}

	fmt.Println("\nStep 2: Create table...")
	_, err = db.Exec(ctx, `
		CREATE TABLE establishment_test_001.legal_journal (
			id BIGSERIAL PRIMARY KEY,
			sequence_number INTEGER NOT NULL UNIQUE,
			transaction_type VARCHAR(20) NOT NULL,
			order_id BIGINT,
			amount DECIMAL(12,4) NOT NULL,
			vat_amount DECIMAL(12,4) NOT NULL,
			payment_method VARCHAR(50) NOT NULL,
			transaction_data JSONB NOT NULL,
			previous_hash VARCHAR(64) NOT NULL,
			current_hash VARCHAR(64) NOT NULL UNIQUE,
			timestamp TIMESTAMPTZ NOT NULL,
			user_id VARCHAR(100),
			register_id VARCHAR(100) NOT NULL,
			created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		fmt.Printf("Create failed: %v\n", err)
		return
	}
	fmt.Println("  ✓ Created")

	fmt.Println("\nStep 3: Query the table immediately...")
	var count int
	err = db.QueryRow(ctx, "SELECT COUNT(*) FROM establishment_test_001.legal_journal").Scan(&count)
	if err != nil {
		fmt.Printf("  ✗ Query failed: %v\n", err)
	} else {
		fmt.Printf("  ✓ SUCCESS! Table has %d rows\n", count)
	}
}
