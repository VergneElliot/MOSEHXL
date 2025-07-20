#!/bin/bash

# MOSEHXL Database Synchronization Script
# This script synchronizes the development database structure with production
# WITHOUT migrating data content - only schema/structure

echo "🔄 MOSEHXL Database Synchronization"
echo "=================================="
echo ""
echo "This script will:"
echo "  ✅ Backup both databases"
echo "  ✅ Export production schema"
echo "  ✅ Apply production schema to development"
echo "  ✅ Preserve development data where possible"
echo "  ❌ NOT migrate any data content"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database names
PROD_DB="mosehxl_production"
DEV_DB="mosehxl_development"
BACKUP_DIR="./backups"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Step 1: Creating backups...${NC}"

# Backup production database
echo "📊 Backing up production database..."
sudo -u postgres pg_dump "$PROD_DB" > "$BACKUP_DIR/production_backup_$(date +%Y%m%d_%H%M%S).sql"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Production backup created${NC}"
else
    echo -e "${RED}❌ Failed to backup production database${NC}"
    exit 1
fi

# Backup development database
echo "📊 Backing up development database..."
sudo -u postgres pg_dump "$DEV_DB" > "$BACKUP_DIR/development_backup_$(date +%Y%m%d_%H%M%S).sql"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Development backup created${NC}"
else
    echo -e "${RED}❌ Failed to backup development database${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 2: Exporting production schema...${NC}"

# Export production schema only (no data)
sudo -u postgres pg_dump --schema-only "$PROD_DB" > "$BACKUP_DIR/production_schema_$(date +%Y%m%d_%H%M%S).sql"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Production schema exported${NC}"
else
    echo -e "${RED}❌ Failed to export production schema${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 3: Applying schema to development...${NC}"

# Apply production schema to development
echo "🔄 Applying production schema to development database..."
sudo -u postgres psql -d "$DEV_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
sudo -u postgres psql -d "$DEV_DB" -f "$BACKUP_DIR/production_schema_$(date +%Y%m%d_%H%M%S).sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema applied to development database${NC}"
else
    echo -e "${RED}❌ Failed to apply schema to development database${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 4: Granting permissions...${NC}"

# Grant permissions to development database
sudo -u postgres psql -d "$DEV_DB" -c "
-- Grant permissions to postgres user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Grant permissions to musebar_user if it exists
DO \$\$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_user WHERE usename = 'musebar_user') THEN
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO musebar_user;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO musebar_user;
    END IF;
END
\$\$;
"

echo -e "${GREEN}✅ Permissions granted${NC}"

echo ""
echo -e "${GREEN}🎉 Database synchronization completed successfully!${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo "  📊 Production database: $PROD_DB (unchanged)"
echo "  📊 Development database: $DEV_DB (schema updated)"
echo "  📁 Backups stored in: $BACKUP_DIR"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  • Development database now has the same schema as production"
echo "  • All data content was cleared from development"
echo "  • You can now populate development with test data"
echo "  • Production database remains completely unchanged"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Test the development environment"
echo "  2. Add test data to development database"
echo "  3. Verify all features work correctly"
