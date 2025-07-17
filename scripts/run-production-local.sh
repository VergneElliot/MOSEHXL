#!/bin/bash

# MOSEHXL Production Local Network Setup
# This script sets up the production environment to run locally and be accessible from phones/tablets

echo "🏭 Setting up MOSEHXL Production for Local Network Access..."

# Get local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "🌐 Local IP Address: $LOCAL_IP"

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
export CORS_ORIGIN="http://localhost:3000,http://$LOCAL_IP:3000"

echo "🗄️  Setting up production database..."

# Create production database (if it doesn't exist)
echo "📊 Creating production database: $DB_NAME"
createdb $DB_NAME 2>/dev/null || echo "Database $DB_NAME already exists"

# Check if database schema exists
echo "🔍 Checking database schema..."
psql -d $DB_NAME -c "\dt" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "📋 Loading production schema..."
    psql -d $DB_NAME -f scripts/schema_production.sql
    echo "✅ Production schema loaded"
else
    echo "✅ Database schema already exists"
fi

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

# Build frontend for production
echo "🔨 Building frontend for production..."
npm run build

# Create a simple server script for the frontend
echo "🌐 Creating frontend server script..."
cat > serve-frontend.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 MOSEHXL Frontend Server running on port ${PORT}`);
  console.log(`🔧 Environment: Production`);
  console.log(`🌐 Server accessible on:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://192.168.0.152:${PORT}`);
  console.log(`📱 Accessible from phones/tablets on your network`);
});
EOF

# Install express for the frontend server
npm install express

echo ""
echo "✅ Production environment setup complete!"
echo ""
echo "🌿 You're now on the main branch"
echo "📊 Production database: $DB_NAME"
echo "🔧 Environment: $NODE_ENV"
echo "🌐 Local IP: $LOCAL_IP"
echo ""
echo "🚀 To start the production system:"
echo "  1. Backend:   cd MuseBar/backend && npm start"
echo "  2. Frontend:  cd MuseBar && node serve-frontend.js"
echo ""
echo "📱 Access URLs:"
echo "  - Local PC:     http://localhost:3000"
echo "  - Phones/Tablets: http://$LOCAL_IP:3000"
echo ""
echo "🚨 IMPORTANT: Production Environment"
echo "   - This contains legally compliant, immutable data"
echo "   - Automatic closure scheduler is ACTIVE"
echo "   - All transactions are recorded in legal journal"
echo "   - Do NOT use for testing or development"
echo ""
echo "🔧 Backend API will be available at:"
echo "  - Local: http://localhost:3001"
echo "  - Network: http://$LOCAL_IP:3001" 