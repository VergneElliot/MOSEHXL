#!/bin/bash
# Restaurant POS - Production Environment Setup
# Replaces MOSEHXL setup-production.sh

set -e

echo "🏭 Setting up Restaurant POS Production Environment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get local IP for network access
LOCAL_IP=$(hostname -I | awk '{print $1}')

# Environment variables
export NODE_ENV=production
export DB_NAME=restaurant_pos_production
export DB_USER=postgres
export PORT=3001
export CORS_ORIGIN="http://localhost:3000,http://$LOCAL_IP:3000"

echo -e "${BLUE}🌐 Local IP Address: $LOCAL_IP${NC}"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    echo ""
    echo "Create .env.production with the following variables:"
    echo "  NODE_ENV=production"
    echo "  PORT=3001"
    echo "  DB_HOST=localhost"
    echo "  DB_PORT=5432"
    echo "  DB_NAME=restaurant_pos_production"
    echo "  DB_USER=postgres"
    echo "  DB_PASSWORD=<your_secure_password>"
    echo "  JWT_SECRET=<your_secure_jwt_secret_32+_chars>"
    echo "  CORS_ORIGIN=http://localhost:3000,http://$LOCAL_IP:3000"
    echo "  ARCHIVE_SECRET_KEY=<your_secure_archive_key>"
    echo ""
    exit 1
fi

echo -e "${BLUE}🗄️  Setting up production database...${NC}"

# Create database if it doesn't exist
echo "📊 Creating database: $DB_NAME"
createdb $DB_NAME 2>/dev/null || echo "Database $DB_NAME already exists"

# Run migrations
echo "🔄 Running database migrations..."
cd "$(dirname "$0")/.."

if ! command -v migrate &> /dev/null; then
    echo -e "${YELLOW}⚠️  golang-migrate not found, skipping migrations${NC}"
else
    source .env.production
    migrate -path migrations -database "postgres://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?sslmode=disable" up
fi

# Build backend
echo -e "${BLUE}🔨 Building Go backend...${NC}"
./scripts/build.sh

# Build frontend
echo -e "${BLUE}🔨 Building Svelte frontend...${NC}"
cd web
npm run build
cd ..

echo ""
echo -e "${GREEN}✅ Production environment setup complete!${NC}"
echo ""
echo -e "${BLUE}📊 Production database: $DB_NAME${NC}"
echo -e "${BLUE}🔧 Environment: production${NC}"
echo -e "${BLUE}🌐 Local IP: $LOCAL_IP${NC}"
echo ""
echo "🚀 To start the production system:"
echo "  ./bin/restaurant-server"
echo ""
echo "📱 Access URLs:"
echo "  - Local PC:       http://localhost:3000"
echo "  - Phones/Tablets: http://$LOCAL_IP:3000"
echo ""
echo -e "${RED}🚨 IMPORTANT: Production Environment${NC}"
echo "   - This contains legally compliant, immutable data"
echo "   - All transactions are recorded in legal journal"
echo "   - Hash chain integrity is enforced"
echo "   - Do NOT use for testing or development"
