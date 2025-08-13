#!/bin/bash

# Email Setup Test Script
# Tests SendGrid configuration and email functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 MuseBar V2 Email Setup Test${NC}"
echo "====================================="

# Check if backend is running
echo -e "${YELLOW}📡 Checking backend status...${NC}"
if ! curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${RED}❌ Backend is not running. Start it first:${NC}"
    echo "cd MuseBar/backend && npm run dev"
    exit 1
fi

echo -e "${GREEN}✅ Backend is running${NC}"

# Check email configuration
echo ""
echo -e "${YELLOW}📧 Checking email configuration...${NC}"
EMAIL_STATUS=$(curl -s http://localhost:3001/api/email-status)

if echo "$EMAIL_STATUS" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Email service is configured${NC}"
    
    # Extract configuration details
    IS_CONFIGURED=$(echo "$EMAIL_STATUS" | grep -o '"isConfigured":[^,]*' | cut -d: -f2)
    FROM_EMAIL=$(grep "FROM_EMAIL=" MuseBar/backend/.env | cut -d= -f2)
    
    echo "   - Configured: $IS_CONFIGURED"
    echo "   - From Email: $FROM_EMAIL"
else
    echo -e "${RED}❌ Email service configuration error${NC}"
    echo "$EMAIL_STATUS"
    exit 1
fi

# Test email functionality
echo ""
echo -e "${YELLOW}📨 Testing email functionality...${NC}"

# Get test email address
read -p "Enter your email address for testing: " TEST_EMAIL

if [ -z "$TEST_EMAIL" ]; then
    echo -e "${RED}❌ Email address required for testing${NC}"
    exit 1
fi

echo -e "${BLUE}📤 Sending test email to $TEST_EMAIL...${NC}"

TEST_RESULT=$(curl -s -X POST http://localhost:3001/api/test-email \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"$TEST_EMAIL\",\"subject\":\"MuseBar V2 Development Test\",\"message\":\"This is a test email from your V2 development environment.\"}")

if echo "$TEST_RESULT" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Test email sent successfully!${NC}"
    
    # Extract tracking ID
    TRACKING_ID=$(echo "$TEST_RESULT" | grep -o '"trackingId":"[^"]*"' | cut -d'"' -f4)
    echo "   - Tracking ID: $TRACKING_ID"
    echo "   - Check your email inbox"
else
    echo -e "${RED}❌ Failed to send test email${NC}"
    echo "$TEST_RESULT"
    
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting:${NC}"
    echo "1. Check SendGrid API key in .env file"
    echo "2. Verify sender email in SendGrid dashboard"
    echo "3. Check backend logs for detailed errors"
    echo "4. Ensure DNS propagation if using subdomain"
fi

# Show email logs
echo ""
echo -e "${YELLOW}📋 Recent email logs:${NC}"
EMAIL_LOGS=$(curl -s http://localhost:3001/api/email-logs)
echo "$EMAIL_LOGS" | jq -r '.logs[] | "\(.timestamp) - \(.to) - \(.status) - \(.subject)"' 2>/dev/null || echo "No logs available"

echo ""
echo -e "${GREEN}✅ Email setup test complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Check your email inbox for the test email"
echo "2. If email received: ✅ Setup is working!"
echo "3. If no email: Check SendGrid dashboard and logs"
echo "4. Test establishment creation with email invitations" 