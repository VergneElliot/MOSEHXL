#!/bin/bash

# MOSEHXL Production Servers Startup Script
# This script starts both the backend and frontend production servers

echo "🚀 Starting MOSEHXL Production Servers..."

# Get local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "🌐 Local IP Address: $LOCAL_IP"

# Set production environment variables
export NODE_ENV=production
export DB_NAME=mosehxl_production
export DB_USER=postgres
export PORT=3001
export CORS_ORIGIN="http://localhost:3000,http://$LOCAL_IP:3000"

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "🔧 Starting Backend Server..."
cd MuseBar/backend
npm start &
BACKEND_PID=$!

echo "🌐 Starting Frontend Server..."
cd ../
npx --yes serve -s build -l 3000 &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting..."
echo ""
echo "📱 Access URLs:"
echo "  - Local PC:     http://localhost:3000"
echo "  - Phones/Tablets: http://$LOCAL_IP:3000"
echo ""
echo "🔧 Backend API:"
echo "  - Local: http://localhost:3001"
echo "  - Network: http://$LOCAL_IP:3001"
echo ""
echo "🚨 IMPORTANT: Production Environment"
echo "   - Legal compliance mode is ACTIVE"
echo "   - All transactions are immutable"
echo "   - Automatic closure scheduler is running"
echo ""
echo "⏹️  Press Ctrl+C to stop both servers"

# Wait for both processes
wait 