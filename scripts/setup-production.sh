#!/bin/bash

# MOSEHXL Production Environment Setup Script
# This script sets up the production environment

echo "🏭 Setting up MOSEHXL Production Environment..."

# Check if we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "⚠️  Warning: You're not on the main branch. Switching to main..."
    git checkout main
fi

# Set production environment variables
export NODE_ENV=production
export DB_NAME=mosehxl_production
export DB_USER=postgres
export PORT=3001

echo "🗄️  Setting up production database..."

# Create production database (if it doesn't exist)
echo "📊 Creating production database: $DB_NAME"
createdb $DB_NAME 2>/dev/null || echo "Database $DB_NAME already exists"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd MuseBar/backend
npm install

# Build backend
echo "🔨 Building backend..."
npm run build

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../
npm install

# Build frontend
echo "🔨 Building frontend..."
npm run build

echo "✅ Production environment setup complete!"
echo ""
echo "🌿 You're now on the main branch"
echo "📊 Production database: $DB_NAME"
echo "🔧 Environment: $NODE_ENV"
echo ""
echo "To start production:"
echo "  Backend:  cd MuseBar/backend && npm start"
echo "  Frontend: cd MuseBar && npm run build && serve -s build"
echo ""
echo "🚨 IMPORTANT: Production Environment"
echo "   - This contains legally compliant, immutable data"
echo "   - Automatic closure scheduler is ACTIVE"
echo "   - All transactions are recorded in legal journal"
echo "   - Do NOT use for testing or development" 