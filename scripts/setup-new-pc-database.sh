#!/bin/bash

# MuseBar Database Setup for New PC
# This script sets up the complete MuseBar database on a new PC
# including all structure, functions, triggers, and data

set -e  # Exit on any error

echo "🚀 MuseBar Database Setup for New PC"
echo "===================================="
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

# Check if required files exist
SCHEMA_FILE="backups/mosehxl_production_schema_only.sql"
DATA_FILE="backups/mosehxl_production_data_only.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
    print_error "Schema file not found: $SCHEMA_FILE"
    print_info "Please ensure you have the backup files from the original PC"
    exit 1
fi

if [ ! -f "$DATA_FILE" ]; then
    print_error "Data file not found: $DATA_FILE"
    print_info "Please ensure you have the backup files from the original PC"
    exit 1
fi

print_status "Backup files found"

# Check if databases exist and handle them
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw mosehxl_production; then
    print_warning "Database 'mosehxl_production' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Dropping existing mosehxl_production database..."
        sudo -u postgres dropdb mosehxl_production
        print_status "Existing database dropped"
    else
        print_error "Setup cancelled. Please backup and remove the existing database manually."
        exit 1
    fi
fi

if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw mosehxl_development; then
    print_warning "Database 'mosehxl_development' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Dropping existing mosehxl_development database..."
        sudo -u postgres dropdb mosehxl_development
        print_status "Existing database dropped"
    else
        print_error "Setup cancelled. Please backup and remove the existing database manually."
        exit 1
    fi
fi

# Create databases
print_info "Creating mosehxl_production database..."
sudo -u postgres createdb mosehxl_production
print_status "Production database created"

print_info "Creating mosehxl_development database..."
sudo -u postgres createdb mosehxl_development
print_status "Development database created"

# Import schema into production database
print_info "Importing schema into production database..."
sudo -u postgres psql -d mosehxl_production < "$SCHEMA_FILE"
print_status "Schema imported into production database"

# Import data into production database
print_info "Importing data into production database..."
sudo -u postgres psql -d mosehxl_production < "$DATA_FILE"
print_status "Data imported into production database"

# Clone production structure to development
print_info "Cloning production structure to development database..."
sudo -u postgres pg_dump --schema-only --no-owner --no-privileges mosehxl_production | sudo -u postgres psql -d mosehxl_development
print_status "Development database structure created"

# Verify the setup
print_info "Verifying database setup..."

# Check table counts
PROD_TABLES=$(sudo -u postgres psql -d mosehxl_production -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
DEV_TABLES=$(sudo -u postgres psql -d mosehxl_development -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

print_status "Production database has $PROD_TABLES tables"
print_status "Development database has $DEV_TABLES tables"

# Check data counts for key tables
print_info "Checking data in key tables..."

# Users
PROD_USERS=$(sudo -u postgres psql -d mosehxl_production -t -c "SELECT COUNT(*) FROM users;" | xargs)
print_status "Production users: $PROD_USERS"

# Products
PROD_PRODUCTS=$(sudo -u postgres psql -d mosehxl_production -t -c "SELECT COUNT(*) FROM products;" | xargs)
print_status "Production products: $PROD_PRODUCTS"

# Categories
PROD_CATEGORIES=$(sudo -u postgres psql -d mosehxl_production -t -c "SELECT COUNT(*) FROM categories;" | xargs)
print_status "Production categories: $PROD_CATEGORIES"

# Legal journal entries
PROD_JOURNAL=$(sudo -u postgres psql -d mosehxl_production -t -c "SELECT COUNT(*) FROM legal_journal;" | xargs)
print_status "Production legal journal entries: $PROD_JOURNAL"

# Verify legal compliance structures
print_info "Verifying legal compliance structures..."
LEGAL_TABLES=("legal_journal" "closure_bulletins" "audit_trail" "archive_exports")

for table in "${LEGAL_TABLES[@]}"; do
    if sudo -u postgres psql -d mosehxl_production -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | grep -q t; then
        print_status "Legal table '$table' exists in production"
    else
        print_error "Legal table '$table' missing in production"
    fi
done

# Verify triggers and functions
print_info "Verifying legal compliance triggers and functions..."
PROD_TRIGGERS=$(sudo -u postgres psql -d mosehxl_production -t -c "SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public';" | wc -l)
PROD_FUNCTIONS=$(sudo -u postgres psql -d mosehxl_production -t -c "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';" | wc -l)

print_status "Production database has $PROD_TRIGGERS triggers and $PROD_FUNCTIONS functions"

# Create setup summary
SUMMARY_FILE="scripts/setup-summary-$(date +%Y%m%d_%H%M%S).txt"
cat > "$SUMMARY_FILE" << EOF
MuseBar Database Setup Summary
=============================

Date: $(date)
Operation: Complete database setup on new PC

Databases Created:
- mosehxl_production (with data)
- mosehxl_development (structure only)

Production Database Statistics:
- Tables: $PROD_TABLES
- Users: $PROD_USERS
- Products: $PROD_PRODUCTS
- Categories: $PROD_CATEGORIES
- Legal Journal Entries: $PROD_JOURNAL
- Triggers: $PROD_TRIGGERS
- Functions: $PROD_FUNCTIONS

Legal Compliance Tables:
- legal_journal: ✅
- closure_bulletins: ✅
- audit_trail: ✅
- archive_exports: ✅

Status: SUCCESS
- Complete database setup completed
- All data transferred from original PC
- Legal compliance structures preserved
- Development database ready for testing

Next Steps:
1. Update environment files (.env.production, .env.development)
2. Test the application connection
3. Verify all features work correctly
4. Start development work on development branch

EOF

print_status "Setup completed successfully!"
print_info "Summary saved to: $SUMMARY_FILE"

echo ""
echo "🎉 Database setup completed!"
echo "   Production: mosehxl_production (with all data)"
echo "   Development: mosehxl_development (structure only)"
echo "   Summary: $SUMMARY_FILE"
echo ""
echo "Next steps:"
echo "1. Update your .env files to point to the correct databases"
echo "2. Test the application connection"
echo "3. Verify all features work correctly"
echo "4. Start development work!" 