#!/bin/bash

# SendGrid Configuration Script
# Helps set up email service for multi-tenant system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📧 SendGrid Email Service Configuration${NC}"
echo "=============================================="

# Check if .env file exists
ENV_FILE="MuseBar/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}📝 Creating .env file...${NC}"
    touch "$ENV_FILE"
fi

echo -e "${YELLOW}🔧 Setting up SendGrid configuration...${NC}"
echo ""
echo -e "${BLUE}📋 Steps to get your SendGrid API key:${NC}"
echo "1. Go to https://sendgrid.com"
echo "2. Create a free account (100 emails/day)"
echo "3. Navigate to Settings → API Keys"
echo "4. Create a new API key with 'Mail Send' permissions"
echo "5. Copy the API key (starts with 'SG.')"
echo ""

read -p "Enter your SendGrid API key: " SENDGRID_API_KEY

if [[ $SENDGRID_API_KEY == SG.* ]]; then
    echo -e "${GREEN}✅ Valid SendGrid API key format detected${NC}"
else
    echo -e "${RED}❌ Invalid API key format. SendGrid keys start with 'SG.'${NC}"
    exit 1
fi

read -p "Enter your verified sender email: " FROM_EMAIL

# Update .env file
echo -e "${YELLOW}📝 Updating environment variables...${NC}"

# Remove existing SendGrid config
sed -i '/^SENDGRID_API_KEY=/d' "$ENV_FILE"
sed -i '/^FROM_EMAIL=/d' "$ENV_FILE"

# Add new config
echo "# Email Service Configuration (SendGrid)" >> "$ENV_FILE"
echo "SENDGRID_API_KEY=$SENDGRID_API_KEY" >> "$ENV_FILE"
echo "FROM_EMAIL=$FROM_EMAIL" >> "$ENV_FILE"
echo "FROM_NAME=MuseBar POS System" >> "$ENV_FILE"
echo "FRONTEND_URL=http://localhost:3000" >> "$ENV_FILE"

echo -e "${GREEN}✅ SendGrid configuration updated${NC}"

# Test email configuration
echo -e "${YELLOW}🧪 Testing email configuration...${NC}"

# Check if backend is running
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend server is running${NC}"
    
    # Test email endpoint
    echo -e "${YELLOW}📧 Testing email service...${NC}"
    curl -s -X POST http://localhost:3001/api/user-management/test-email \
      -H "Content-Type: application/json" \
      -d "{\"to\":\"$FROM_EMAIL\",\"subject\":\"Test Email\",\"message\":\"This is a test email from MuseBar POS\"}" || echo -e "${YELLOW}⚠️  Email test endpoint not available yet${NC}"
    
else
    echo -e "${RED}❌ Backend server is not running${NC}"
    echo "Please start the backend server first:"
    echo "cd MuseBar/backend && npm start"
fi

echo ""
echo -e "${GREEN}🎉 SendGrid configuration completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Verify your sender email in SendGrid dashboard"
echo "2. Test email functionality via the admin interface"
echo "3. Create your first establishment"
echo "4. Test the invitation flow"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "- Free SendGrid accounts allow 100 emails/day"
echo "- Verify your sender email in SendGrid dashboard"
echo "- Test emails in development environment first" 