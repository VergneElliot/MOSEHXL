#!/bin/bash
# Build script for restaurant POS system
# Compiles Go backend + builds Svelte frontend

set -e  # Exit on error

echo "🔨 Building Restaurant POS System..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Build backend
echo -e "${BLUE}📦 Building Go backend...${NC}"
cd "$(dirname "$0")/.."

# Build for current platform
go build -o bin/restaurant-server ./cmd/server

# Optional: Build for Linux (deployment)
# GOOS=linux GOARCH=amd64 go build -o bin/restaurant-server-linux ./cmd/server

echo -e "${GREEN}✅ Backend built: bin/restaurant-server${NC}"

# Build frontend
echo -e "${BLUE}🌐 Building Svelte frontend...${NC}"
cd web
npm run build

echo -e "${GREEN}✅ Frontend built: web/build/${NC}"

# Show binary size
echo ""
echo -e "${BLUE}📊 Build artifacts:${NC}"
ls -lh ../bin/restaurant-server
du -sh build

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "To run:"
echo "  ./bin/restaurant-server"
