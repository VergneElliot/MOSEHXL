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
