# 🏢 Multi-Tenant SaaS Architecture Plan

## Overview

Transform MuseBar from single-establishment system into enterprise-grade **multi-tenant SaaS platform** for POS/restaurant management.

---

## 🎯 **Architecture Goals**

1. **Complete Data Isolation** - Each establishment's data completely separated
2. **Hierarchical User Management** - System → Establishment → Employee levels
3. **Email Service Integration** - Professional user onboarding and notifications
4. **Self-Service User Management** - Users control their own passwords/profiles
5. **Cloud-Ready Deployment** - Scalable for multiple establishments

---

## 🏗️ **Multi-Tenant Architecture Design**

### **Option A: Schema-Based Multi-Tenancy (Recommended)**
✅ **One database, multiple schemas per establishment**
- Better resource utilization
- Easier maintenance and backups
- Cost-effective for scaling
- Simpler deployment

### **Option B: Database-Per-Tenant**
- Complete isolation but higher overhead
- Complex backup/maintenance
- Higher costs at scale

**🎯 Recommendation: Schema-based approach for optimal balance of isolation and efficiency**

---

## 👥 **User Hierarchy Design**

### **1. System Administrators**
- **Access**: All establishments and system management
- **Responsibilities**:
  - Create new establishments
  - Manage establishment billing/subscriptions
  - System monitoring and maintenance
  - Global settings and policies

### **2. Establishment Administrators** 
- **Access**: Their establishment only
- **Responsibilities**:
  - Manage establishment settings
  - Create/manage employee accounts
  - View all establishment data
  - Configure permissions and roles

### **3. Employees (Role-Based)**
- **Access**: Specific features within their establishment
- **Roles**: Cashier, Manager, Supervisor, etc.
- **Permissions**: Granular feature access control

---

## 📧 **Email Service Integration**

### **Email Provider Options**
1. **SendGrid** (Recommended - reliable, good API)
2. **Amazon SES** (Cost-effective for high volume)
3. **Mailgun** (Developer-friendly)
4. **Postmark** (Great deliverability)

### **Email Templates Needed**
- **Establishment Welcome** - New establishment onboarding
- **User Invitation** - Employee account creation
- **Password Reset** - Self-service password recovery
- **Email Verification** - Account confirmation
- **System Notifications** - Important updates

---

## 🗄️ **Database Schema Changes**

### **New Tables Required**

```sql
-- Establishments (tenants)
CREATE TABLE establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    schema_name VARCHAR(50) NOT NULL UNIQUE,
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id),
    email VARCHAR(200) NOT NULL,
    password_hash VARCHAR(200),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL, -- 'system_admin', 'establishment_admin', 'manager', 'cashier'
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    invitation_token VARCHAR(255),
    invitation_expires TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(email, establishment_id)
);

-- Role definitions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    establishment_id UUID REFERENCES establishments(id),
    permissions JSONB NOT NULL DEFAULT '[]',
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT,
    template_variables JSONB DEFAULT '[]',
    is_system_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email logs
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id),
    recipient_email VARCHAR(200) NOT NULL,
    template_name VARCHAR(100),
    subject VARCHAR(255),
    status VARCHAR(50), -- 'sent', 'failed', 'pending'
    provider_message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔄 **Implementation Phases**

### **Phase 1: Email Service Foundation** (Week 1)
- [ ] Email service provider setup (SendGrid)
- [ ] Email templates system
- [ ] Basic email sending functionality
- [ ] Email verification flow

### **Phase 2: Multi-Tenant Foundation** (Week 2) 
- [ ] Establishments table and model
- [ ] Enhanced user model with establishment linking
- [ ] Schema-based data isolation
- [ ] Tenant context middleware

### **Phase 3: User Management Overhaul** (Week 3)
- [ ] System admin interface
- [ ] Establishment admin dashboard
- [ ] User invitation system
- [ ] Self-service password management

### **Phase 4: Role-Based Permissions** (Week 4)
- [ ] Enhanced role system
- [ ] Granular permissions
- [ ] Role assignment interface
- [ ] Permission enforcement

---

## 🚀 **Development Approach**

### **1. Start with Email Service** 
- Implement email foundation first
- Test with current single-tenant setup
- Verify delivery and templates work

### **2. Gradual Multi-Tenant Migration**
- Add establishment concept
- Maintain backward compatibility
- Migrate current MuseBar as first establishment

### **3. User Management Enhancement**
- Build on email foundation
- Implement invitation flows
- Add self-service features

---

## 🔧 **Technical Implementation**

### **Environment Variables Needed**
```env
# Email Service
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=MuseBar POS System

# Multi-Tenant
DEFAULT_SCHEMA=public
MASTER_DB_SCHEMA=system
ENABLE_MULTI_TENANT=true
```

### **Middleware Updates**
- **Tenant Context Middleware** - Extract establishment from request
- **Schema Switching** - Route queries to correct establishment schema
- **Enhanced Auth** - Include establishment context in tokens

---

## 🎯 **Success Metrics**

### **Phase 1 Success**
- [ ] Email verification working
- [ ] Password reset via email
- [ ] Template system functional

### **Multi-Tenant Success** 
- [ ] Multiple establishments isolated
- [ ] No data leakage between tenants
- [ ] Performance maintained

### **User Management Success**
- [ ] Self-service user onboarding
- [ ] Role-based access working
- [ ] Admin can manage users easily

---

## 🔐 **Security Considerations**

1. **Data Isolation**: Ensure complete tenant separation
2. **Row-Level Security**: Additional PostgreSQL RLS if needed
3. **Email Security**: SPF/DKIM/DMARC configuration
4. **Token Security**: Include establishment context in JWT
5. **Admin Access**: Secure system admin interfaces

---

## 📋 **Next Immediate Steps**

1. **Choose Email Provider** (SendGrid recommended)
2. **Set up Email Service Integration** 
3. **Create Email Templates System**
4. **Implement User Invitation Flow**
5. **Test with Current MuseBar Setup**

Would you like me to start with **Phase 1: Email Service Implementation**? I can integrate SendGrid and create the email template system first, then we'll build the multi-tenant architecture on top of that foundation.

---

**🎯 Goal**: Transform MuseBar into scalable SaaS platform ready for commercial deployment to multiple establishments while maintaining all existing functionality. 