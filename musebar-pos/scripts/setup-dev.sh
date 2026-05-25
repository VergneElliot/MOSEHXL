#!/bin/bash
# Restaurant POS - Development Environment Setup
# Replaces MOSEHXL setup-development.sh

set -e

echo "🚀 Setting up Restaurant POS Development Environment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Environment variables
export NODE_ENV=development
export DB_NAME=restaurant_pos_development
export DB_USER=postgres
export DB_PASSWORD=postgres
export PORT=3001
export CORS_ORIGIN=http://localhost:3000

echo -e "${BLUE}🗄️  Setting up development database...${NC}"

# Create database if it doesn't exist
echo "📊 Creating database: $DB_NAME"
createdb $DB_NAME 2>/dev/null || echo "Database $DB_NAME already exists"

# Run migrations
echo "🔄 Running database migrations..."
cd "$(dirname "$0")/.."

# Check if golang-migrate is installed
if ! command -v migrate &> /dev/null; then
    echo -e "${YELLOW}⚠️  golang-migrate not found. Install it:${NC}"
    echo "  go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
    echo ""
    echo "For now, you can manually run migrations from migrations/ folder"
else
    migrate -path migrations -database "postgres://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?sslmode=disable" up
fi

# Install Go dependencies
echo -e "${BLUE}📦 Installing Go dependencies...${NC}"
go mod download
go mod tidy

# Install frontend dependencies (if web directory exists)
if [ -d "web" ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    cd web
    npm install
    cd ..
else
    echo -e "${YELLOW}⏭️  Skipping frontend setup (web/ directory not created yet)${NC}"
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${BLUE}📝 Creating .env file...${NC}"
    cat > .env << EOF
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=restaurant_pos_development
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=http://localhost:3000
ARCHIVE_SECRET_KEY=$(openssl rand -base64 32)
EOF
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists, skipping${NC}"
fi

echo ""
echo -e "${GREEN}✅ Development environment setup complete!${NC}"
echo ""
echo -e "${BLUE}📊 Development database: $DB_NAME${NC}"
echo -e "${BLUE}🔧 Environment: $NODE_ENV${NC}"
echo ""
echo "To start development:"
echo "  1. Backend:  go run cmd/server/main.go"
echo "  2. Frontend: cd web && npm run dev"
echo ""
echo -e "${YELLOW}⚠️  Remember: All development work should preserve legal compliance!${NC}"
