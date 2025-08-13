-- Multi-Tenant Database Schema
-- Supports establishment-based data isolation and user management

-- Establishments table (tenants)
CREATE TABLE IF NOT EXISTS establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    schema_name VARCHAR(50) NOT NULL UNIQUE,
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_subscription_plan CHECK (subscription_plan IN ('basic', 'premium', 'enterprise')),
    CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('active', 'suspended', 'cancelled'))
);

-- Enhanced users table with establishment linking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id),
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'cashier',
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS invitation_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing users to have verified emails (backward compatibility)
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_establishments_email ON establishments(email);
CREATE INDEX IF NOT EXISTS idx_establishments_schema_name ON establishments(schema_name);
CREATE INDEX IF NOT EXISTS idx_establishments_subscription_status ON establishments(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_establishment_id ON users(establishment_id);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- User invitations table (temporary storage for invitation process)
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(200) NOT NULL,
    establishment_id UUID REFERENCES establishments(id),
    inviter_user_id VARCHAR(100) NOT NULL,
    inviter_name VARCHAR(200) NOT NULL,
    establishment_name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'cashier',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    invitation_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    
    CONSTRAINT valid_invitation_status CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    CONSTRAINT valid_invitation_role CHECK (role IN ('cashier', 'manager', 'supervisor', 'establishment_admin', 'system_admin'))
);

-- Indexes for user invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_invitations_establishment_id ON user_invitations(establishment_id);

-- Password reset requests table
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(200) NOT NULL,
    reset_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Indexes for password reset requests
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_token ON password_reset_requests(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_expires_at ON password_reset_requests(expires_at);

-- Email logs table for tracking email delivery
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id),
    recipient_email VARCHAR(200) NOT NULL,
    template_name VARCHAR(100),
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered', 'bounced'
    provider_message_id VARCHAR(255),
    tracking_id VARCHAR(100),
    error_message TEXT,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_email_status CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'bounced', 'opened', 'clicked'))
);

-- Indexes for email logs
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_name ON email_logs(template_name);
CREATE INDEX IF NOT EXISTS idx_email_logs_tracking_id ON email_logs(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- Enhanced roles table for granular permissions
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    establishment_id UUID REFERENCES establishments(id),
    permissions JSONB NOT NULL DEFAULT '[]',
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(name, establishment_id)
);

-- Insert default system roles
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
('system_admin', 'System Administrator - Full access to all establishments', 
 '["system:*", "establishments:*", "users:*", "billing:*", "monitoring:*"]', true),
('establishment_admin', 'Establishment Administrator - Full access to their establishment', 
 '["establishment:*", "users:create", "users:read", "users:update", "reports:*", "settings:*"]', true),
('manager', 'Manager - Management functions within establishment', 
 '["pos:*", "reports:read", "users:read", "inventory:*", "settings:read"]', true),
('supervisor', 'Supervisor - Supervisory functions and reporting', 
 '["pos:*", "reports:read", "users:read", "returns:approve"]', true),
('cashier', 'Cashier - Basic POS operations', 
 '["pos:read", "pos:create", "orders:create", "products:read"]', true)
ON CONFLICT (name, establishment_id) DO NOTHING;

-- User role assignments (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES establishments(id),
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- For temporary role assignments
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(user_id, role_id, establishment_id)
);

-- Indexes for user role assignments
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_establishment_id ON user_role_assignments(establishment_id);

-- Update trigger to maintain updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_establishments_updated_at ON establishments;
CREATE TRIGGER update_establishments_updated_at 
    BEFORE UPDATE ON establishments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get user permissions (combines role-based and direct permissions)
CREATE OR REPLACE FUNCTION get_user_permissions(user_id_param INTEGER)
RETURNS TEXT[] AS $$
DECLARE
    user_permissions TEXT[];
    role_permissions TEXT[];
    all_permissions TEXT[];
BEGIN
    -- Get direct user permissions (from existing user_permissions table)
    SELECT ARRAY_AGG(p.name) INTO user_permissions
    FROM permissions p
    JOIN user_permissions up ON up.permission_id = p.id
    WHERE up.user_id = user_id_param;
    
    -- Get role-based permissions
    SELECT ARRAY_AGG(DISTINCT perm) INTO role_permissions
    FROM (
        SELECT UNNEST(r.permissions::TEXT[]) as perm
        FROM roles r
        JOIN user_role_assignments ura ON ura.role_id = r.id
        WHERE ura.user_id = user_id_param 
        AND ura.is_active = TRUE
        AND (ura.expires_at IS NULL OR ura.expires_at > CURRENT_TIMESTAMP)
        AND r.is_active = TRUE
    ) AS role_perms;
    
    -- Combine and deduplicate permissions
    SELECT ARRAY_AGG(DISTINCT perm) INTO all_permissions
    FROM (
        SELECT UNNEST(COALESCE(user_permissions, ARRAY[]::TEXT[])) as perm
        UNION
        SELECT UNNEST(COALESCE(role_permissions, ARRAY[]::TEXT[])) as perm
    ) AS combined_perms;
    
    RETURN COALESCE(all_permissions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(user_id_param INTEGER, permission_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_permissions TEXT[];
BEGIN
    SELECT get_user_permissions(user_id_param) INTO user_permissions;
    
    -- Check for exact permission or wildcard permissions
    RETURN (
        permission_param = ANY(user_permissions) OR
        EXISTS (
            SELECT 1 FROM UNNEST(user_permissions) AS perm
            WHERE perm LIKE '%:*' AND permission_param LIKE REPLACE(perm, '*', '%')
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired tokens (to be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- Cleanup expired invitations
    UPDATE user_invitations 
    SET status = 'expired' 
    WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    -- Cleanup expired password reset requests
    DELETE FROM password_reset_requests 
    WHERE expires_at < CURRENT_TIMESTAMP AND used_at IS NULL;
    
    -- Cleanup old email logs (keep last 90 days)
    DELETE FROM email_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for user summary with role information
CREATE OR REPLACE VIEW user_summary AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role as primary_role,
    u.is_admin,
    u.is_active,
    u.email_verified,
    u.last_login,
    u.created_at,
    u.updated_at,
    e.name as establishment_name,
    e.id as establishment_id,
    COALESCE(
        ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), 
        ARRAY[]::VARCHAR[]
    ) as assigned_roles,
    get_user_permissions(u.id) as permissions
FROM users u
LEFT JOIN establishments e ON e.id = u.establishment_id
LEFT JOIN user_role_assignments ura ON ura.user_id = u.id AND ura.is_active = TRUE
LEFT JOIN roles r ON r.id = ura.role_id AND r.is_active = TRUE
GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.is_admin, 
         u.is_active, u.email_verified, u.last_login, u.created_at, u.updated_at,
         e.name, e.id;

-- Comments for documentation
COMMENT ON TABLE establishments IS 'Multi-tenant establishments with isolated data schemas';
COMMENT ON TABLE user_invitations IS 'Stores pending user invitations with secure tokens';
COMMENT ON TABLE password_reset_requests IS 'Tracks password reset requests with expiration';
COMMENT ON TABLE email_logs IS 'Logs all email communications for tracking and debugging';
COMMENT ON TABLE roles IS 'Defines roles with JSON-based permissions for flexibility';
COMMENT ON TABLE user_role_assignments IS 'Many-to-many relationship between users and roles';
COMMENT ON VIEW user_summary IS 'Comprehensive view of users with roles and permissions';
COMMENT ON FUNCTION get_user_permissions IS 'Returns combined permissions from direct assignments and roles';
COMMENT ON FUNCTION user_has_permission IS 'Checks if user has specific permission including wildcards';
COMMENT ON FUNCTION cleanup_expired_tokens IS 'Maintenance function to clean up expired tokens and logs'; 