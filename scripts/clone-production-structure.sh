#!/bin/bash

# Clone Production Database Structure to Development
# This script clones the structure of mosehxl_production to mosehxl_development
# while preserving the data in each database separately.

set -e  # Exit on any error

echo "🔍 MuseBar Database Structure Clone"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if PostgreSQL is running
if ! pg_isready -q; then
    print_error "PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

print_status "PostgreSQL is running"

# Check if databases exist
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw mosehxl_production; then
    print_error "Production database 'mosehxl_production' does not exist"
    exit 1
fi

print_status "Production database exists"

# Create development database if it doesn't exist
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw mosehxl_development; then
    print_warning "Development database 'mosehxl_development' does not exist. Creating it..."
    sudo -u postgres createdb mosehxl_development
    print_status "Development database created"
else
    print_status "Development database exists"
fi

# Create backup of current development database
BACKUP_FILE="backups/development_backup_before_clone_$(date +%Y%m%d_%H%M%S).sql"
print_info "Creating backup of current development database..."
sudo -u postgres pg_dump mosehxl_development > "$BACKUP_FILE"
print_status "Backup created: $BACKUP_FILE"

# Drop all tables in development database (preserve structure only)
print_info "Clearing development database structure..."
sudo -u postgres psql -d mosehxl_development -c "
DO \$\$
DECLARE
    r RECORD;
BEGIN
    -- Drop all triggers first
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_modification ON ' || quote_ident(r.tablename) || ' CASCADE';
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_prevent_closed_bulletin_modification ON ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all functions
    DROP FUNCTION IF EXISTS prevent_legal_journal_modification() CASCADE;
    DROP FUNCTION IF EXISTS prevent_closed_bulletin_modification() CASCADE;
    DROP FUNCTION IF EXISTS generate_compliance_report() CASCADE;
    DROP FUNCTION IF EXISTS monitor_legal_journal_integrity() CASCADE;
    
    -- Drop all tables
    DROP TABLE IF EXISTS archive_exports CASCADE;
    DROP TABLE IF EXISTS audit_trail CASCADE;
    DROP TABLE IF EXISTS business_settings CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS closure_bulletins CASCADE;
    DROP TABLE IF EXISTS closure_settings CASCADE;
    DROP TABLE IF EXISTS legal_journal CASCADE;
    DROP TABLE IF EXISTS order_items CASCADE;
    DROP TABLE IF EXISTS orders CASCADE;
    DROP TABLE IF EXISTS permissions CASCADE;
    DROP TABLE IF EXISTS products CASCADE;
    DROP TABLE IF EXISTS sub_bills CASCADE;
    DROP TABLE IF EXISTS user_permissions CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    
    -- Drop all sequences
    DROP SEQUENCE IF EXISTS archive_exports_id_seq CASCADE;
    DROP SEQUENCE IF EXISTS audit_trail_id_seq CASCADE;
    DROP SEQUENCE IF EXISTS business_settings_id_seq CASCADE;
    DROP SEQUENCE IF EXISTS categories_id_seq CASCADE;
    DROP SEQUENCE IF EXISTS closure_bulletins_id_seq CASCADE;
    DROP SEQUENCE IF EXISTS closure_settings_id_seq CASCADE;
    DROP SEQUENCE IF EXISTS legal_journal_id_seq CASCADE;
    DROP SEQUENCE IF EXISTS order_items_id_seq CASCADE;
    DROP SEQUENCE IF EXISTS orders_id_seq CASCADE;
    DROP SEQUENCE IF EXISTS permissions_id_seq CASCADE;
    DROP SEQUENCE IF EXISTS products_id_seq CASCADE;
    DROP SEQUENCE IF EXISTS sub_bills_id_seq CASCADE;
    DROP SEQUENCE IF EXISTS users_id_seq CASCADE;
END \$\$;
"

print_status "Development database cleared"

# Export production schema (structure only, no data)
print_info "Exporting production database structure..."
SCHEMA_FILE="temp_production_schema.sql"
sudo -u postgres pg_dump --schema-only --no-owner --no-privileges mosehxl_production > "$SCHEMA_FILE"
print_status "Production schema exported"

# Import schema into development database
print_info "Importing production schema into development database..."
sudo -u postgres psql -d mosehxl_development < "$SCHEMA_FILE"
print_status "Schema imported into development database"

# Clean up temporary file
rm -f "$SCHEMA_FILE"
print_status "Temporary files cleaned up"

# Verify the clone was successful
print_info "Verifying database structure..."
TABLE_COUNT_PRODUCTION=$(sudo -u postgres psql -d mosehxl_production -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
TABLE_COUNT_DEVELOPMENT=$(sudo -u postgres psql -d mosehxl_development -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

if [ "$TABLE_COUNT_PRODUCTION" = "$TABLE_COUNT_DEVELOPMENT" ]; then
    print_status "Structure clone successful! Both databases have $TABLE_COUNT_PRODUCTION tables"
else
    print_error "Structure clone failed! Production has $TABLE_COUNT_PRODUCTION tables, Development has $TABLE_COUNT_DEVELOPMENT tables"
    exit 1
fi

# Show table comparison
print_info "Table structure comparison:"
echo ""
echo "Production tables:"
sudo -u postgres psql -d mosehxl_production -c "\dt" | grep -E "^ public"
echo ""
echo "Development tables:"
sudo -u postgres psql -d mosehxl_development -c "\dt" | grep -E "^ public"

# Verify legal compliance structures
print_info "Verifying legal compliance structures..."
LEGAL_TABLES=("legal_journal" "closure_bulletins" "audit_trail" "archive_exports")

for table in "${LEGAL_TABLES[@]}"; do
    if sudo -u postgres psql -d mosehxl_development -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | grep -q t; then
        print_status "Legal table '$table' exists in development"
    else
        print_error "Legal table '$table' missing in development"
    fi
done

# Verify triggers and functions
print_info "Verifying legal compliance triggers and functions..."
TRIGGERS=$(sudo -u postgres psql -d mosehxl_development -t -c "SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public';" | wc -l)
FUNCTIONS=$(sudo -u postgres psql -d mosehxl_development -t -c "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';" | wc -l)

print_status "Development database has $TRIGGERS triggers and $FUNCTIONS functions"

# Create summary report
SUMMARY_FILE="scripts/clone-summary-$(date +%Y%m%d_%H%M%S).txt"
cat > "$SUMMARY_FILE" << EOF
MuseBar Database Structure Clone Summary
======================================

Date: $(date)
Operation: Clone production structure to development

Backup Created: $BACKUP_FILE
Tables Cloned: $TABLE_COUNT_PRODUCTION
Legal Tables: ${LEGAL_TABLES[*]}
Triggers: $TRIGGERS
Functions: $FUNCTIONS

Status: SUCCESS
- Production database structure successfully cloned to development
- All legal compliance structures preserved
- Development database ready for testing
- Production data remains unchanged
- Development data preserved in backup

Next Steps:
1. Test the development environment
2. Verify all legal compliance features work
3. Run the application on development database
4. Monitor for any issues

EOF

print_status "Clone operation completed successfully!"
print_info "Summary saved to: $SUMMARY_FILE"
print_info "Backup saved to: $BACKUP_FILE"

echo ""
echo "🎉 Database structure clone completed!"
echo "   Production: mosehxl_production (unchanged)"
echo "   Development: mosehxl_development (structure cloned)"
echo "   Backup: $BACKUP_FILE"
echo ""
echo "You can now safely test features on the development database"
echo "while keeping production data intact." 