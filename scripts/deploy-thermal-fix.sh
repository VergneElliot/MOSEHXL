#!/bin/bash

# Deploy Thermal Printer Fix to Cloud Server
# This script deploys the thermal printer server environment fix

set -e  # Exit on any error

echo "🔧 Deploying Thermal Printer Fix to Cloud Server"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Server details
SERVER_IP="209.38.223.92"
SERVER_USER="root"  # Adjust if different

print_status "Connecting to server $SERVER_IP..."

# Function to execute command on remote server
remote_exec() {
    ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

# Function to copy file to remote server
remote_copy() {
    scp -o StrictHostKeyChecking=no "$1" $SERVER_USER@$SERVER_IP:"$2"
}

print_status "Backing up current files..."
remote_exec "cd /var/www/MOSEHXL && cp -r MuseBar/backend/src/utils/thermalPrintService.ts MuseBar/backend/src/utils/thermalPrintService.ts.backup"
remote_exec "cd /var/www/MOSEHXL && cp -r MuseBar/backend/src/routes/legal.ts MuseBar/backend/src/routes/legal.ts.backup"

print_status "Copying updated files to server..."

# Copy the updated thermal print service
remote_copy "MuseBar/backend/src/utils/thermalPrintService.ts" "/var/www/MOSEHXL/MuseBar/backend/src/utils/thermalPrintService.ts"

# Copy the updated legal routes
remote_copy "MuseBar/backend/src/routes/legal.ts" "/var/www/MOSEHXL/MuseBar/backend/src/routes/legal.ts"

print_status "Building backend on server..."
remote_exec "cd /var/www/MOSEHXL/MuseBar/backend && npm run build"

print_status "Restarting backend service..."
remote_exec "cd /var/www/MOSEHXL/MuseBar/backend && pm2 restart musebar-backend || pm2 start dist/app.js --name musebar-backend"

print_status "Checking service status..."
remote_exec "pm2 status"

print_success "Thermal printer fix deployed successfully!"
print_status "Testing the fix..."

# Test the thermal print endpoint
print_status "Testing thermal print endpoint..."
TEST_RESPONSE=$(remote_exec "curl -s -X POST 'http://localhost:3001/api/legal/receipt/754/thermal-print?type=detailed' -H 'Content-Type: application/json'")

if echo "$TEST_RESPONSE" | grep -q "success.*true"; then
    print_success "Thermal print endpoint is working correctly!"
    echo "Response: $TEST_RESPONSE"
else
    print_warning "Thermal print endpoint test failed. Response: $TEST_RESPONSE"
fi

print_status "Testing printer status endpoint..."
STATUS_RESPONSE=$(remote_exec "curl -s 'http://localhost:3001/api/legal/thermal-printer/status'")

if echo "$STATUS_RESPONSE" | grep -q "available.*false"; then
    print_success "Printer status endpoint is working correctly!"
    echo "Status: $STATUS_RESPONSE"
else
    print_warning "Printer status endpoint test failed. Response: $STATUS_RESPONSE"
fi

print_success "Deployment completed!"
print_warning "You can now test the thermal print functionality on your web interface."
print_status "The fix should resolve the 'spawn lp ENOENT' error." 