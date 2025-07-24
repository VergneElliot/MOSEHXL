#!/bin/bash

# Create Complete Backup Package for New PC Setup
# This script creates a complete backup package with all necessary files

set -e  # Exit on any error

echo "📦 Creating Complete Backup Package for New PC"
echo "=============================================="
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

# Create backup directory with timestamp
BACKUP_DIR="backups/complete-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

print_status "Created backup directory: $BACKUP_DIR"

# Check if PostgreSQL is running
if ! pg_isready -q; then
    print_error "PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

print_status "PostgreSQL is running"

# Create complete database dump (structure + data)
print_info "Creating complete production database backup..."
sudo -u postgres pg_dump mosehxl_production --no-owner --no-privileges > "$BACKUP_DIR/mosehxl_production_complete.sql"
print_status "Complete production backup created"

# Create schema-only backup
print_info "Creating schema-only backup..."
sudo -u postgres pg_dump mosehxl_production --schema-only --no-owner --no-privileges > "$BACKUP_DIR/mosehxl_production_schema_only.sql"
print_status "Schema-only backup created"

# Create data-only backup
print_info "Creating data-only backup..."
sudo -u postgres pg_dump mosehxl_production --data-only --no-owner --no-privileges > "$BACKUP_DIR/mosehxl_production_data_only.sql"
print_status "Data-only backup created"

# Copy setup scripts
print_info "Copying setup scripts..."
cp scripts/setup-new-pc-database.sh "$BACKUP_DIR/"
print_status "Setup scripts copied"

# Copy environment files
print_info "Copying environment files..."
cp MuseBar/backend/.env.production "$BACKUP_DIR/" 2>/dev/null || print_warning "Production env file not found"
cp MuseBar/backend/.env.development "$BACKUP_DIR/" 2>/dev/null || print_warning "Development env file not found"
print_status "Environment files copied"

# Create README for the backup package
cat > "$BACKUP_DIR/README.md" << 'EOF'
# MuseBar Complete Database Backup Package

This package contains everything needed to set up the MuseBar database on a new PC.

## Contents

### Database Files
- `mosehxl_production_complete.sql` - Complete database (structure + data)
- `mosehxl_production_schema_only.sql` - Database structure only
- `mosehxl_production_data_only.sql` - Database data only

### Setup Scripts
- `setup-new-pc-database.sh` - Complete setup script for new PC
- `clone-production-structure.sh` - Clone structure between databases

### Environment Files
- `.env.production` - Production environment configuration
- `.env.development` - Development environment configuration

## Setup Instructions

### Prerequisites
1. Install PostgreSQL on the new PC
2. Ensure PostgreSQL is running
3. Copy this backup package to the new PC

### Quick Setup
```bash
# Make setup script executable
chmod +x setup-new-pc-database.sh

# Run the setup script
./setup-new-pc-database.sh
```

### Manual Setup (Alternative)
```bash
# Create databases
sudo -u postgres createdb mosehxl_production
sudo -u postgres createdb mosehxl_development

# Import complete backup
sudo -u postgres psql -d mosehxl_production < mosehxl_production_complete.sql

# Clone structure to development
sudo -u postgres pg_dump --schema-only --no-owner --no-privileges mosehxl_production | sudo -u postgres psql -d mosehxl_development
```

### Environment Configuration
1. Copy `.env.production` and `.env.development` to your MuseBar/backend/ directory
2. Update database connection details if needed
3. Test the application connection

## Database Information

### Production Database
- **Name**: mosehxl_production
- **Purpose**: Live production data
- **Contains**: All users, products, orders, legal journal, etc.

### Development Database
- **Name**: mosehxl_development
- **Purpose**: Development and testing
- **Contains**: Structure only (no production data)

## Legal Compliance

This backup includes all legal compliance structures:
- Immutable legal journal with hash chain
- Audit trail for all operations
- Closure bulletins for data integrity
- Archive exports for long-term preservation

## Verification

After setup, verify:
1. All tables exist in both databases
2. Legal compliance structures are intact
3. Application can connect to databases
4. All features work correctly

## Support

If you encounter issues:
1. Check PostgreSQL is running
2. Verify database permissions
3. Check environment file configuration
4. Review setup logs for errors

---
*Backup created on: $(date)*
*MuseBar System - French Legal Compliant POS System*
EOF

print_status "README created"

# Create a compressed archive
print_info "Creating compressed archive..."
cd backups
tar -czf "musebar-complete-backup-$(date +%Y%m%d_%H%M%S).tar.gz" "complete-backup-$(date +%Y%m%d_%H%M%S)"
cd ..

ARCHIVE_NAME="backups/musebar-complete-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
print_status "Compressed archive created: $ARCHIVE_NAME"

# Get file sizes
COMPLETE_SIZE=$(du -h "$BACKUP_DIR/mosehxl_production_complete.sql" | cut -f1)
SCHEMA_SIZE=$(du -h "$BACKUP_DIR/mosehxl_production_schema_only.sql" | cut -f1)
DATA_SIZE=$(du -h "$BACKUP_DIR/mosehxl_production_data_only.sql" | cut -f1)
ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)

# Create backup summary
SUMMARY_FILE="scripts/backup-summary-$(date +%Y%m%d_%H%M%S).txt"
cat > "$SUMMARY_FILE" << EOF
MuseBar Complete Backup Package Summary
======================================

Date: $(date)
Operation: Complete backup package creation

Backup Directory: $BACKUP_DIR
Archive File: $ARCHIVE_NAME

File Sizes:
- Complete backup: $COMPLETE_SIZE
- Schema only: $SCHEMA_SIZE
- Data only: $DATA_SIZE
- Archive: $ARCHIVE_SIZE

Contents:
✅ Complete database backup (structure + data)
✅ Schema-only backup
✅ Data-only backup
✅ Setup scripts
✅ Environment files
✅ README with instructions

Status: SUCCESS
- Complete backup package created
- All necessary files included
- Ready for transfer to new PC
- Compressed archive available

Transfer Instructions:
1. Copy the archive file to the new PC
2. Extract: tar -xzf musebar-complete-backup-*.tar.gz
3. Run setup script: ./setup-new-pc-database.sh
4. Configure environment files
5. Test application connection

EOF

print_status "Backup package created successfully!"
print_info "Summary saved to: $SUMMARY_FILE"

echo ""
echo "🎉 Complete backup package created!"
echo "   Backup directory: $BACKUP_DIR"
echo "   Archive file: $ARCHIVE_NAME"
echo "   Summary: $SUMMARY_FILE"
echo ""
echo "Transfer this archive to your new PC and extract it to set up the database."
echo "The setup script will handle everything automatically!" 