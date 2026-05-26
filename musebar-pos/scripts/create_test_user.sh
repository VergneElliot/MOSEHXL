#!/bin/bash
# Create test user for authentication

DB_NAME="restaurant_pos_development"

# Hash password "password123" using Go
cd ~/Documents/private_projects/MOSEHXL/musebar-pos

cat > cmd/hash-password/main.go << 'EOFGO'
package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := "password123"
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	fmt.Print(string(hash))
}
EOFGO

PASSWORD_HASH=$(go run cmd/hash-password/main.go)

echo "Creating test user..."
psql -d $DB_NAME << SQL
-- Get the test establishment ID
DO \$\$
DECLARE
    test_est_id UUID;
BEGIN
    SELECT id INTO test_est_id FROM establishments WHERE email = 'test@musebar.com';
    
    -- Insert test user
    INSERT INTO users (email, password_hash, first_name, last_name, role, establishment_id, is_active)
    VALUES (
        'admin@musebar.com',
        '$PASSWORD_HASH',
        'Admin',
        'User',
        'establishment_admin',
        test_est_id,
        true
    )
    ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash;
END \$\$;

SELECT email, role, establishment_id FROM users WHERE email = 'admin@musebar.com';
SQL

echo ""
echo "✅ Test user created:"
echo "   Email: admin@musebar.com"
echo "   Password: password123"
echo "   Role: establishment_admin"
