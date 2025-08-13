# V2 Development Email Setup Guide

## Overview

This guide helps you set up SendGrid email service for your V2 development environment without conflicting with your V1 production system running on `mosehxl.com`.

## Current Situation

- **V1 Production**: Running on `mosehxl.com` with `noreply@mosehxl.com`
- **V2 Development**: Running locally with need for email functionality
- **Problem**: Can't use same domain/email as V1 production

## Solution Options

### Option 1: Subdomain Approach (Recommended)

Use a subdomain of your existing domain for development:

1. **Create subdomain**: `dev.mosehxl.com` or `v2.mosehxl.com`
2. **Verify in SendGrid**: Add domain authentication
3. **Use sender**: `noreply@dev.mosehxl.com`

**Pros:**
- Professional appearance
- Uses your existing domain
- Easy to manage
- No conflicts with V1

**Cons:**
- Requires DNS configuration
- Takes time to propagate

### Option 2: Personal Email Verification

Use your personal email for development:

1. **Add to SendGrid**: Verify your personal email
2. **Use sender**: `your-email@gmail.com`

**Pros:**
- Quick setup
- No DNS changes needed
- Immediate availability

**Cons:**
- Less professional
- Personal email in development logs

### Option 3: Separate Domain

Use a completely different domain for development.

## Quick Setup

### Automated Setup

Run the setup script:

```bash
./scripts/setup-dev-email.sh
```

This script will:
1. Show current email configuration
2. Offer setup options
3. Update your `.env` file
4. Provide SendGrid setup instructions

### Manual Setup

#### Step 1: Choose Your Approach

**For Subdomain (Recommended):**
```bash
# Update .env file
sed -i 's/FROM_EMAIL=noreply@mosehxl.com/FROM_EMAIL=noreply@dev.mosehxl.com/' MuseBar/backend/.env
sed -i 's/FROM_NAME=MuseBar POS System/FROM_NAME=MuseBar POS System (Development)/' MuseBar/backend/.env
```

**For Personal Email:**
```bash
# Update .env file
sed -i 's/FROM_EMAIL=noreply@mosehxl.com/FROM_EMAIL=your-email@gmail.com/' MuseBar/backend/.env
sed -i 's/FROM_NAME=MuseBar POS System/FROM_NAME=MuseBar POS System (Development)/' MuseBar/backend/.env
```

#### Step 2: SendGrid Configuration

**For Subdomain:**

1. Log into SendGrid account
2. Go to Settings → Sender Authentication
3. Click "Authenticate Your Domain"
4. Enter: `dev.mosehxl.com` (or your chosen subdomain)
5. Follow DNS setup instructions

**DNS Records to Add:**
```
Type: CNAME
Name: dev
Value: sendgrid.net
```

**For Personal Email:**

1. Log into SendGrid account
2. Go to Settings → Sender Authentication
3. Click "Verify a Single Sender"
4. Add your email address
5. Check email and click verification link

#### Step 3: Test Configuration

1. Restart backend:
```bash
cd MuseBar/backend
npm run dev
```

2. Test email functionality:
   - Create a new establishment
   - Check if invitation email is sent
   - Monitor backend logs for errors

## Troubleshooting

### Common Issues

**"Forbidden" Error:**
- Email not verified in SendGrid
- Check SendGrid dashboard for verification status

**"Unauthorized" Error:**
- API key invalid or expired
- Regenerate API key in SendGrid

**DNS Issues:**
- Wait 24 hours for DNS propagation
- Check DNS records with: `nslookup dev.mosehxl.com`

### Email Testing

Test email configuration:

```bash
# Check current configuration
grep -E "^(SENDGRID_API_KEY|FROM_EMAIL|FROM_NAME)=" MuseBar/backend/.env

# Test email service (if endpoint available)
curl -X POST http://localhost:3001/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","message":"Test email"}'
```

## Development vs Production

### Environment-Specific Configuration

**Development (.env):**
```env
FROM_EMAIL=noreply@dev.mosehxl.com
FROM_NAME=MuseBar POS System (Development)
NODE_ENV=development
```

**Production (.env):**
```env
FROM_EMAIL=noreply@mosehxl.com
FROM_NAME=MuseBar POS System
NODE_ENV=production
```

### Best Practices

1. **Never use production email in development**
2. **Use descriptive sender names** (include "Development" or "V2")
3. **Test email functionality thoroughly** before deployment
4. **Monitor email logs** during development
5. **Use different API keys** for dev/prod if possible

## Email Service Features

Your V2 email service includes:

- ✅ Template-based emails
- ✅ Email tracking and logging
- ✅ Delivery status monitoring
- ✅ Bounce handling
- ✅ Professional templates
- ✅ Multi-tenant support

## Next Steps

1. **Run the setup script**: `./scripts/setup-dev-email.sh`
2. **Complete SendGrid verification** (follow instructions)
3. **Test email functionality** through the UI
4. **Monitor logs** for any issues
5. **Deploy to production** when ready

## Support

If you encounter issues:

1. Check backend logs for detailed error messages
2. Verify SendGrid configuration in dashboard
3. Test with simple email first
4. Check DNS propagation if using subdomain

---

**Note**: This setup ensures your V2 development environment has full email functionality without interfering with your V1 production system. 