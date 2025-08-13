#!/bin/bash

# Development Email Setup Script for V2
# This script configures SendGrid for development without conflicting with V1 production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 MuseBar V2 Development Email Setup${NC}"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "MuseBar/backend/.env" ]; then
    echo -e "${RED}❌ Error: .env file not found. Run this script from the project root.${NC}"
    exit 1
fi

ENV_FILE="MuseBar/backend/.env"

echo -e "${YELLOW}📧 Current Email Configuration:${NC}"
echo "----------------------------------------"
grep -E "^(SENDGRID_API_KEY|FROM_EMAIL|FROM_NAME)=" "$ENV_FILE" || echo "No email configuration found"

echo ""
echo -e "${BLUE}🎯 Development Email Setup Options:${NC}"
echo "=========================================="
echo "1. Use subdomain: noreply@dev.mosehxl.com (Recommended)"
echo "2. Use subdomain: noreply@v2.mosehxl.com"
echo "3. Use personal email for development"
echo "4. Skip email setup for now"

read -p "Choose an option (1-4): " choice

case $choice in
    1)
        NEW_FROM_EMAIL="noreply@dev.mosehxl.com"
        NEW_FROM_NAME="MuseBar POS System (Development)"
        ;;
    2)
        NEW_FROM_EMAIL="noreply@v2.mosehxl.com"
        NEW_FROM_NAME="MuseBar POS System (V2 Development)"
        ;;
    3)
        read -p "Enter your personal email for development: " personal_email
        NEW_FROM_EMAIL="$personal_email"
        NEW_FROM_NAME="MuseBar POS System (Development)"
        ;;
    4)
        echo -e "${YELLOW}⚠️  Skipping email configuration. You can configure it later.${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid option. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}🔧 Updating Email Configuration...${NC}"

# Update FROM_EMAIL
if grep -q "^FROM_EMAIL=" "$ENV_FILE"; then
    sed -i "s/^FROM_EMAIL=.*/FROM_EMAIL=$NEW_FROM_EMAIL/" "$ENV_FILE"
else
    echo "FROM_EMAIL=$NEW_FROM_EMAIL" >> "$ENV_FILE"
fi

# Update FROM_NAME
if grep -q "^FROM_NAME=" "$ENV_FILE"; then
    sed -i "s/^FROM_NAME=.*/FROM_NAME=$NEW_FROM_NAME/" "$ENV_FILE"
else
    echo "FROM_NAME=$NEW_FROM_NAME" >> "$ENV_FILE"
fi

echo -e "${GREEN}✅ Email configuration updated!${NC}"
echo ""
echo -e "${YELLOW}📧 New Configuration:${NC}"
echo "FROM_EMAIL=$NEW_FROM_EMAIL"
echo "FROM_NAME=$NEW_FROM_NAME"
echo ""

# SendGrid Setup Instructions
echo -e "${BLUE}📋 SendGrid Setup Instructions:${NC}"
echo "======================================"

if [[ $choice == 1 || $choice == 2 ]]; then
    echo -e "${YELLOW}🌐 Domain Verification Required:${NC}"
    echo "1. Log into your SendGrid account"
    echo "2. Go to Settings → Sender Authentication"
    echo "3. Add Domain Authentication for: $(echo $NEW_FROM_EMAIL | cut -d@ -f2)"
    echo "4. Follow the DNS setup instructions"
    echo "5. Wait for DNS propagation (can take up to 24 hours)"
    echo ""
    echo -e "${GREEN}💡 Quick DNS Setup:${NC}"
    echo "Add these records to your DNS (mosehxl.com):"
    echo "Type: CNAME"
    echo "Name: dev (or v2)"
    echo "Value: sendgrid.net"
    echo ""
elif [[ $choice == 3 ]]; then
    echo -e "${YELLOW}📧 Single Sender Verification:${NC}"
    echo "1. Log into your SendGrid account"
    echo "2. Go to Settings → Sender Authentication"
    echo "3. Click 'Verify a Single Sender'"
    echo "4. Add: $NEW_FROM_EMAIL"
    echo "5. Check your email and click the verification link"
    echo ""
fi

echo -e "${BLUE}🧪 Testing Email Configuration:${NC}"
echo "====================================="
echo "1. Restart your backend server"
echo "2. Test email functionality through the UI"
echo "3. Check backend logs for email errors"

echo ""
echo -e "${GREEN}✅ Development email setup complete!${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Complete SendGrid verification (see instructions above)"
echo "2. Restart backend: cd MuseBar/backend && npm run dev"
echo "3. Test establishment creation with email invitations"
echo "4. Check email logs in the backend console" 