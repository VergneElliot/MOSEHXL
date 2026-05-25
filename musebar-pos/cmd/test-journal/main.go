package main

import (
	"context"
	"fmt"
	"log"

	"musebar-pos/internal/config"
	"musebar-pos/internal/domain/legal"
	"musebar-pos/internal/repository/postgres"
)

func main() {
	fmt.Println("🧪 Testing Legal Journal Hash Calculation...")

	cfg, _ := config.Load()
	db, _ := config.InitDB(cfg)
	defer db.Close()

	legalRepo := postgres.NewLegalRepository(db)
	journalService := legal.NewJournalService(legalRepo)

	ctx := context.Background()
	schema := "establishment_test_001"

	// Drop and recreate table
	db.Exec(ctx, "DROP TABLE IF EXISTS establishment_test_001.legal_journal CASCADE")
	// (run setup script to recreate)

	orderData := map[string]interface{}{
		"order_id": 1001,
		"items": []map[string]interface{}{
			{"name": "Coffee", "price": 10.00, "quantity": 1},
		},
	}

	// Use the debug version
	err := journalService.RecordSaleDebug(
		ctx,
		schema,
		1001,
		10.00,
		1.67,
		"CASH",
		orderData,
		nil,
		"MUSEBAR-REG-001",
	)
	if err != nil {
		log.Fatalf("Failed: %v", err)
	}

	fmt.Println("Now check database:")
	fmt.Println("  psql -d restaurant_pos_development -c \"SELECT current_hash FROM establishment_test_001.legal_journal WHERE sequence_number = 0;\"")
}
