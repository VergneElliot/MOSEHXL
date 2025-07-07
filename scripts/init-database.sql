-- MOSEHXL Database Initialization Script
-- This script creates the required databases for production and development

-- Create development database
CREATE DATABASE mosehxl_development;

-- Create production database  
CREATE DATABASE mosehxl_production;

-- Create a dedicated user for MOSEHXL (optional but recommended)
-- CREATE USER mosehxl_user WITH PASSWORD 'secure_password_here';
-- GRANT ALL PRIVILEGES ON DATABASE mosehxl_development TO mosehxl_user;
-- GRANT ALL PRIVILEGES ON DATABASE mosehxl_production TO mosehxl_user;

-- Notes:
-- 1. Run this script as a PostgreSQL superuser (usually 'postgres')
-- 2. After creating databases, run the schema setup from MuseBar/backend/src/models/schema.sql
-- 3. For production, ensure proper backup and security measures
-- 4. Development database can be reset/recreated as needed
-- 5. Production database should NEVER be reset once in use (legal compliance) 