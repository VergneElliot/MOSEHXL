#!/bin/bash

# Multi-Tenant Database Schema Application Script
# Applies the enhanced schema for multi-tenant user management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME=${DB_NAME:-"mosehxl_development"}
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}

echo -e "${BLUE}🏢 Multi-Tenant Database Schema Application${NC}"
echo "================================================"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL client (psql) is not installed or not in PATH${NC}"
    exit 1
fi

# Check database connection
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to database $DB_NAME on $DB_HOST:$DB_PORT${NC}"
    echo "Please check your database configuration:"
    echo "  DB_NAME: $DB_NAME"
    echo "  DB_USER: $DB_USER"
    echo "  DB_HOST: $DB_HOST"
    echo "  DB_PORT: $DB_PORT"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"

# Apply the multi-tenant schema
echo -e "${YELLOW}📋 Applying multi-tenant database schema...${NC}"

# Check if schema file exists
SCHEMA_FILE="MuseBar/backend/src/models/multi-tenant-schema.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Schema file not found: $SCHEMA_FILE${NC}"
    exit 1
fi

# Apply schema with error handling
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE"; then
    echo -e "${GREEN}✅ Multi-tenant schema applied successfully${NC}"
else
    echo -e "${RED}❌ Failed to apply multi-tenant schema${NC}"
    exit 1
fi

# Verify schema application
echo -e "${YELLOW}🔍 Verifying schema application...${NC}"

# Check if establishments table exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'establishments');" | grep -q "t"; then
    echo -e "${GREEN}✅ Establishments table created successfully${NC}"
else
    echo -e "${RED}❌ Establishments table not found${NC}"
    exit 1
fi

# Check if user_invitations table exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_invitations');" | grep -q "t"; then
    echo -e "${GREEN}✅ User invitations table created successfully${NC}"
else
    echo -e "${RED}❌ User invitations table not found${NC}"
    exit 1
fi

# Check if email_logs table exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_logs');" | grep -q "t"; then
    echo -e "${GREEN}✅ Email logs table created successfully${NC}"
else
    echo -e "${RED}❌ Email logs table not found${NC}"
    exit 1
fi

# Check if roles table exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'roles');" | grep -q "t"; then
    echo -e "${GREEN}✅ Roles table created successfully${NC}"
else
    echo -e "${RED}❌ Roles table not found${NC}"
    exit 1
fi

# Check if users table has been enhanced
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'establishment_id');" | grep -q "t"; then
    echo -e "${GREEN}✅ Users table enhanced with establishment_id column${NC}"
else
    echo -e "${RED}❌ Users table not properly enhanced${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Multi-tenant database schema application completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Summary of changes:${NC}"
echo "  ✅ Establishments table created"
echo "  ✅ User invitations table created"
echo "  ✅ Email logs table created"
echo "  ✅ Roles table created"
echo "  ✅ Users table enhanced with multi-tenant support"
echo "  ✅ Password reset requests table created"
echo "  ✅ User role assignments table created"
echo "  ✅ Database functions and triggers created"
echo ""
echo -e "${YELLOW}⚠️  Next steps:${NC}"
echo "  1. Configure SendGrid API key in your environment"
echo "  2. Set up email templates for invitations"
echo "  3. Test the establishment invitation flow"
echo "  4. Create your first system administrator account"
echo ""
echo -e "${BLUE}🔧 Environment variables needed:${NC}"
echo "  SENDGRID_API_KEY=your_sendgrid_api_key"
echo "  FROM_EMAIL=noreply@yourdomain.com"
echo "  FROM_NAME=MuseBar POS System"
echo "  FRONTEND_URL=http://localhost:3000" 