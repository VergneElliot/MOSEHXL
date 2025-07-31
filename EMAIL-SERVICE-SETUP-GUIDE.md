# 📧 Email Service & User Management Setup Guide

## Overview

This guide walks you through setting up the **SendGrid email service** and **user invitation system** that we just implemented. This enables:

- **Professional user invitations via email**
- **Self-service password resets**
- **Email verification**
- **Multi-establishment user management** (foundation)

---

## 🚀 **Quick Setup Steps**

### **Step 1: Create SendGrid Account**

1. **Sign up** at [SendGrid.com](https://sendgrid.com)
2. **Verify your email** and complete account setup
3. **Get your API key**:
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Choose "Restricted Access"
   - Give permissions: **Mail Send** (Full Access)
   - **Copy the API key** (you'll only see it once!)

### **Step 2: Configure Environment Variables**

Create/update your `.env` file in `MuseBar/backend/`:

```env@
# Email Service Configuration
SENDGRID_API_KEY=SG.your_actual_sendgrid_api_key_here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=MuseBar POS System
FRONTEND_URL=http://localhost:3000

# Existing configurations...
JWT_SECRET=your-super-secure-jwt-secret
DATABASE_URL=postgresql://username:password@localhost:5432/musebar_development
PORT=3001
NODE_ENV=development
```

### **Step 3: Update Database Schema**

Run the enhanced user schema to add new features:

```bash
cd MuseBar/backend
psql -d musebar_development -f src/models/enhanced-user-schema.sql
```

Or if you prefer using your existing database connection:
```sql
-- Connect to your database and run the contents of:
-- MuseBar/backend/src/models/enhanced-user-schema.sql
```

### **Step 4: Test Email Configuration**

Start your backend server and test the email service:

```bash
cd MuseBar/backend
npm start
```

Then test with a simple API call:
```bash
# Test if email service is working (replace with your email)
curl -X POST http://localhost:3001/api/user-management/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{"testEmail": "your-email@example.com"}'
```

---

## 🎯 **How to Use the New Features**

### **1. Send User Invitations (Admin)**

```bash
curl -X POST http://localhost:3001/api/user-management/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "email": "newuser@example.com",
    "role": "cashier",
    "firstName": "John",
    "lastName": "Doe",
    "establishmentName": "MuseBar"
  }'
```

### **2. User Accepts Invitation**

The invited user receives an email with a link like:
```
http://localhost:3000/accept-invitation?token=abc123...
```

They fill out the form to set their password and complete account setup.

### **3. Password Reset Flow**

Users can request password resets at:
```
http://localhost:3000/reset-password
```

---

## 🏗️ **Frontend Integration**

### **Add Routes to Your App**

Update your `MuseBar/src/App.tsx` to include the new routes:

```tsx
import InvitationAcceptance from './components/InvitationAcceptance';
import PasswordReset from './components/PasswordReset';

// In your Routes component:
<Route path="/accept-invitation" element={<InvitationAcceptance />} />
<Route path="/reset-password" element={<PasswordReset />} />
```

### **Update Login Component**

Add a "Forgot Password?" link to your login form:

```tsx
<Button 
  variant="text" 
  onClick={() => navigate('/reset-password')}
>
  Forgot your password?
</Button>
```

### **Admin User Management**

Create an admin interface to send invitations:

```tsx
// Example invitation form
const sendInvitation = async (data) => {
  const response = await fetch('/api/user-management/invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify(data)
  });
  
  if (response.ok) {
    alert('Invitation sent successfully!');
  }
};
```

---

## 🔧 **Advanced Configuration**

### **Custom Email Domain**

For production, set up a **custom sending domain**:

1. **Go to SendGrid** → Settings → Sender Authentication
2. **Authenticate your domain** (e.g., `@musebar.com`)
3. **Add DNS records** as instructed
4. **Update FROM_EMAIL** to use your domain

### **Email Templates Customization**

The system includes built-in templates, but you can customize them:

```typescript
// In your backend code
emailService.addTemplate({
  id: 'custom_invitation',
  name: 'Custom Invitation',
  subject: 'Welcome to {{establishmentName}}!',
  htmlBody: `<!-- Your custom HTML -->`,
  variables: ['establishmentName', 'recipientName']
});
```

### **Production Environment**

For production deployment:

```env
NODE_ENV=production
FRONTEND_URL=https://your-production-domain.com
FROM_EMAIL=noreply@your-domain.com
SENDGRID_API_KEY=your_production_sendgrid_key
```

---

## 🧪 **Testing the System**

### **1. Test Email Service**

```bash
# Test email configuration
curl -X POST http://localhost:3001/api/user-management/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"testEmail": "test@example.com"}'
```

### **2. Test User Invitation Flow**

1. **Send invitation** (as admin)
2. **Check email** for invitation link
3. **Click link** and complete account setup
4. **Verify** user can log in with new account

### **3. Test Password Reset**

1. **Request password reset** at `/reset-password`
2. **Check email** for reset link
3. **Click link** and set new password
4. **Verify** login with new password

---

## 🚨 **Troubleshooting**

### **Email Not Sending**

```bash
# Check email service status
curl http://localhost:3001/api/user-management/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Common issues:**
- **Invalid API Key**: Double-check SendGrid API key
- **Domain Authentication**: Verify sender domain in SendGrid
- **Rate Limits**: SendGrid has sending limits for new accounts

### **Database Errors**

```sql
-- Check if new tables exist
\dt user_invitations
\dt password_reset_requests
\dt email_logs

-- Check user table columns
\d users
```

### **Frontend Routing Issues**

Ensure your frontend router can handle the new routes:
```tsx
// Make sure these routes are properly defined
/accept-invitation?token=...
/reset-password?token=...
```

---

## 🎯 **Next Steps**

With email service working, you're ready for:

1. **🏢 Multi-Tenant Architecture** - Multiple establishments
2. **👥 Advanced Role Management** - Granular permissions
3. **📊 User Analytics** - Track user engagement
4. **🔔 Notification System** - System notifications via email

---

## 📋 **Security Best Practices**

### **Email Security**
- ✅ Use **environment variables** for API keys
- ✅ Set up **SPF/DKIM** records for your domain
- ✅ **Rate limit** email sending endpoints
- ✅ **Validate** all email addresses

### **Token Security**
- ✅ **Tokens expire** (7 days for invitations, 1 hour for password resets)
- ✅ **One-time use** for password reset tokens
- ✅ **Secure random** token generation
- ✅ **HTTPS only** in production

### **User Data Protection**
- ✅ **Hash passwords** with bcrypt (12 rounds)
- ✅ **Email enumeration protection** (don't reveal if email exists)
- ✅ **Audit logging** for all user actions
- ✅ **Clean up** expired tokens regularly

---

**🎉 You now have a professional user management system with email integration!**

Users can be invited via email, set their own passwords, and reset passwords securely - eliminating the need for admins to manage passwords manually. 