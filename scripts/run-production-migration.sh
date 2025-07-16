#!/bin/bash

# Production Migration Runner for MOSEHXL
# This script safely migrates database structure changes to production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_DB="mosehxl_production"
DEVELOPMENT_DB="mosehxl_development"
MIGRATION_SCRIPT="scripts/production-migration-2024.sql"
BACKUP_DIR="./backups"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MOSEHXL Production Migration Runner${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to check if PostgreSQL is running
check_postgres() {
    echo -e "${YELLOW}Checking PostgreSQL connection...${NC}"
    if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        echo -e "${RED}❌ PostgreSQL is not running. Please start PostgreSQL first.${NC}"
        echo "Try: sudo systemctl start postgresql"
        exit 1
    fi
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
}

# Function to create backup
create_backup() {
    echo -e "${YELLOW}Creating backup of production database...${NC}"
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Create backup filename with timestamp
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if pg_dump -h localhost -U postgres "$PRODUCTION_DB" > "$BACKUP_FILE" 2>/dev/null; then
        echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
        echo -e "${YELLOW}Backup size: $(du -h "$BACKUP_FILE" | cut -f1)${NC}"
    else
        echo -e "${RED}❌ Failed to create backup. Please check your database credentials.${NC}"
        echo "Make sure you have access to the production database."
        exit 1
    fi
}

# Function to check if production database exists
check_production_db() {
    echo -e "${YELLOW}Checking production database...${NC}"
    if psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw "$PRODUCTION_DB"; then
        echo -e "${GREEN}✅ Production database exists${NC}"
    else
        echo -e "${RED}❌ Production database '$PRODUCTION_DB' does not exist.${NC}"
        echo "Please create the production database first."
        exit 1
    fi
}

# Function to run migration
run_migration() {
    echo -e "${YELLOW}Running migration script...${NC}"
    
    if [ ! -f "$MIGRATION_SCRIPT" ]; then
        echo -e "${RED}❌ Migration script not found: $MIGRATION_SCRIPT${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}Applying migration: $MIGRATION_SCRIPT${NC}"
    
    if PGPASSWORD=postgres psql -h localhost -U postgres -d "$PRODUCTION_DB" -f "$MIGRATION_SCRIPT"; then
        echo -e "${GREEN}✅ Migration completed successfully!${NC}"
    else
        echo -e "${RED}❌ Migration failed. Please check the error messages above.${NC}"
        echo -e "${YELLOW}You can restore from backup if needed:${NC}"
        echo "psql -h localhost -U postgres -d $PRODUCTION_DB < $BACKUP_FILE"
        exit 1
    fi
}

# Function to verify migration
verify_migration() {
    echo -e "${YELLOW}Verifying migration...${NC}"
    
    # Check if color column exists in categories
    if PGPASSWORD=postgres psql -h localhost -U postgres -d "$PRODUCTION_DB" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'color';" | grep -q color; then
        echo -e "${GREEN}✅ Color column added to categories table${NC}"
    else
        echo -e "${RED}❌ Color column not found in categories table${NC}"
        return 1
    fi
    
    # Check if description column exists in order_items
    if PGPASSWORD=postgres psql -h localhost -U postgres -d "$PRODUCTION_DB" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'description';" | grep -q description; then
        echo -e "${GREEN}✅ Description column added to order_items table${NC}"
    else
        echo -e "${RED}❌ Description column not found in order_items table${NC}"
        return 1
    fi
    
    # Check if legal_journal table exists
    if PGPASSWORD=postgres psql -h localhost -U postgres -d "$PRODUCTION_DB" -t -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'legal_journal';" | grep -q legal_journal; then
        echo -e "${GREEN}✅ Legal journal table exists${NC}"
    else
        echo -e "${YELLOW}⚠️  Legal journal table not found (may not be needed in production)${NC}"
    fi
    
    echo -e "${GREEN}✅ Migration verification completed${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Starting production migration process...${NC}"
    echo
    
    # Check prerequisites
    check_postgres
    check_production_db
    
    echo
    echo -e "${YELLOW}⚠️  WARNING: This will modify your production database structure${NC}"
    echo -e "${YELLOW}⚠️  No data will be lost, but structure changes will be applied${NC}"
    echo
    
    # Ask for confirmation
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Migration cancelled.${NC}"
        exit 0
    fi
    
    echo
    echo -e "${YELLOW}⚠️  Creating backup before proceeding...${NC}"
    create_backup
    
    echo
    echo -e "${YELLOW}⚠️  Running migration...${NC}"
    run_migration
    
    echo
    echo -e "${YELLOW}⚠️  Verifying migration...${NC}"
    verify_migration
    
    echo
    echo -e "${GREEN}🎉 Production migration completed successfully!${NC}"
    echo -e "${GREEN}Your production database now has all the latest structural changes.${NC}"
    echo
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Update your production environment configuration"
    echo "2. Restart your production application"
    echo "3. Test the new features in production"
    echo
    echo -e "${YELLOW}Backup location: $BACKUP_FILE${NC}"
}

# Run main function
main "$@" 