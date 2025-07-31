#!/bin/bash

# Simplified Multi-Tenant System Setup Script
# Configures environment variables and initial setup for MuseBar POS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏢 MuseBar Multi-Tenant System Setup${NC}"
echo "=============================================="

# Check if .env file exists
ENV_FILE="MuseBar/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}📝 Creating .env file...${NC}"
    touch "$ENV_FILE"
fi

# Function to add or update environment variable
add_env_var() {
    local key=$1
    local value=$2
    local comment=$3
    
    # Remove existing line if it exists
    sed -i "/^${key}=/d" "$ENV_FILE"
    
    # Add new line with comment
    if [ ! -z "$comment" ]; then
        echo "# $comment" >> "$ENV_FILE"
    fi
    echo "${key}=${value}" >> "$ENV_FILE"
}

echo -e "${YELLOW}🔧 Configuring environment variables...${NC}"

# Database Configuration
add_env_var "DB_HOST" "localhost" "Database Configuration"
add_env_var "DB_PORT" "5432" ""
add_env_var "DB_NAME" "mosehxl_development" ""
add_env_var "DB_USER" "postgres" ""
add_env_var "DB_PASSWORD" "postgres" ""

# Server Configuration
add_env_var "PORT" "3001" "Server Configuration"
add_env_var "NODE_ENV" "development" ""
add_env_var "CORS_ORIGIN" "http://localhost:3000" ""

# JWT Configuration
add_env_var "JWT_SECRET" "your-super-secure-jwt-secret-change-this-in-production" "JWT Configuration"

# Email Service Configuration (SendGrid)
add_env_var "SENDGRID_API_KEY" "your_sendgrid_api_key_here" "Email Service Configuration"
add_env_var "FROM_EMAIL" "noreply@yourdomain.com" ""
add_env_var "FROM_NAME" "MuseBar POS System" ""
add_env_var "FRONTEND_URL" "http://localhost:3000" ""

# Multi-Tenant Configuration
add_env_var "MULTI_TENANT_ENABLED" "true" "Multi-Tenant Configuration"
add_env_var "DEFAULT_ESTABLISHMENT_SCHEMA" "establishment_" ""

echo -e "${GREEN}✅ Environment variables configured${NC}"

# Create system admin user if not exists
echo -e "${YELLOW}👤 Setting up system administrator...${NC}"

# Check if system admin exists
ADMIN_EXISTS=$(psql -h localhost -U postgres -d mosehxl_development -t -c "SELECT COUNT(*) FROM users WHERE role = 'system_admin';" 2>/dev/null | tr -d ' ')

if [ "$ADMIN_EXISTS" = "0" ]; then
    echo -e "${YELLOW}📝 Creating system administrator account...${NC}"
    
    # Create a default system admin (password will need to be changed)
    psql -h localhost -U postgres -d mosehxl_development -c "
        INSERT INTO users (username, email, password, role, email_verified, first_name, last_name)
        VALUES ('admin', 'admin@musebar.com', 'admin123', 'system_admin', true, 'System', 'Administrator')
        ON CONFLICT (username) DO NOTHING;
    " > /dev/null 2>&1
    
    echo -e "${GREEN}✅ System administrator created (admin/admin123)${NC}"
    echo -e "${YELLOW}⚠️  Please change the default password after first login${NC}"
else
    echo -e "${GREEN}✅ System administrator already exists${NC}"
fi

# Create test establishment
echo -e "${YELLOW}🏢 Creating test establishment...${NC}"
psql -h localhost -U postgres -d mosehxl_development -c "
    INSERT INTO establishments (name, email, schema_name, subscription_plan)
    VALUES ('Test Establishment', 'test@example.com', 'establishment_test', 'basic')
    ON CONFLICT (email) DO NOTHING;
" > /dev/null 2>&1

echo -e "${GREEN}✅ Test establishment created${NC}"

# Verify setup
echo -e "${YELLOW}🔍 Verifying setup...${NC}"

# Check database tables
TABLES=("establishments" "user_invitations" "email_logs" "roles" "users")
for table in "${TABLES[@]}"; do
    if psql -h localhost -U postgres -d mosehxl_development -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | grep -q "t"; then
        echo -e "${GREEN}✅ $table table exists${NC}"
    else
        echo -e "${RED}❌ $table table missing${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 Multi-tenant system setup completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Configure SendGrid API key in MuseBar/backend/.env"
echo "2. Start the backend server: cd MuseBar/backend && npm start"
echo "3. Start the frontend: cd MuseBar && npm start"
echo "4. Test the establishment invitation flow"
echo "5. Create your first establishment via the admin interface"
echo ""
echo -e "${YELLOW}🔧 API Endpoints to test:${NC}"
echo "  GET  /api/health                    - Health check"
echo "  GET  /api/establishments            - List establishments"
echo "  POST /api/user-management/send-establishment-invitation - Send establishment invitation"
echo "  POST /api/user-management/send-user-invitation        - Send user invitation"
echo ""
echo -e "${BLUE}📧 Email Templates Available:${NC}"
echo "  - establishment-invitation"
echo "  - user-invitation"
echo "  - password-reset"
echo "  - email-verification" 