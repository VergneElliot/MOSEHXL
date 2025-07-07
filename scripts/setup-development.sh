#!/bin/bash

# MOSEHXL Development Environment Setup Script
# This script sets up the development environment with a separate database

echo "🚀 Setting up MOSEHXL Development Environment..."

# Check if we're on development branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "development" ]; then
    echo "⚠️  Warning: You're not on the development branch. Switching to development..."
    git checkout development
fi

# Set development environment variables
export NODE_ENV=development
export DB_NAME=mosehxl_development
export DB_USER=postgres
export DB_PASSWORD=postgres
export PORT=3001

echo "🗄️  Setting up development database..."

# Create development database (if it doesn't exist)
echo "📊 Creating development database: $DB_NAME"
createdb $DB_NAME 2>/dev/null || echo "Database $DB_NAME already exists"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd MuseBar/backend
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../
npm install

echo "✅ Development environment setup complete!"
echo ""
echo "🌿 You're now on the development branch"
echo "📊 Development database: $DB_NAME"
echo "🔧 Environment: $NODE_ENV"
echo ""
echo "To start development:"
echo "  Backend:  cd MuseBar/backend && npm run dev"
echo "  Frontend: cd MuseBar && npm start"
echo ""
echo "⚠️  Remember: All development work should be done on this branch!"
echo "   - Don't commit directly to main"
echo "   - Test thoroughly before creating pull requests"
echo "   - Legal compliance features must work correctly" 