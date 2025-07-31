# Database Migration Guide for MOSEHXL

This guide explains how to manage database migrations between your main (production) and development branches.

## Overview

Your project uses two separate databases:
- **Production Database** (`mosehxl_production`): Contains real-world legal data that must not be tampered with
- **Development Database** (`mosehxl_development`): Contains mock/generated data for testing features

## Current Status (July 18, 2025)

✅ **System is fully operational and legally compliant**
✅ **Development branch will be synced with main branch**
✅ **All databases are clean and optimized**

## Migration Strategy

### Key Principles
1. **Structure Only**: Migrations only transfer database schema/structure changes, never data content
2. **Safe Operations**: All migrations use `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` to prevent conflicts
3. **Backup First**: Always backup your production database before any migration
4. **Test First**: Test migrations on a copy of production data before applying to production

## Available Scripts

- `migrate-main-to-development.sql` - Apply production schema to development
- `migrate-development-to-main.sql` - Apply development changes to production
- `run-migration.sh` - Safe migration runner with confirmations

## Usage

```bash
# Sync development with current production schema
./scripts/run-migration.sh main-to-dev

# Apply development changes to production
./scripts/run-migration.sh dev-to-main
```

## Important Notes

- Always backup before migrations
- Test on copies of production data first
- Never migrate data content, only structure
- Maintain legal compliance in all changes

### 1. Main to Development Migration
**File**: `scripts/migrate-main-to-development.sql`
**Purpose**: Apply schema changes from main branch to development branch
**When to use**: After making schema changes in main branch that need to be available in development

### 2. Development to Main Migration
**File**: `scripts/migrate-development-to-main.sql`
**Purpose**: Apply schema changes from development branch to main branch
**When to use**: After testing new features in development and wanting to deploy them to production

### 3. Migration Runner
**File**: `scripts/run-migration.sh`
**Purpose**: Safe execution of migrations with error handling and user confirmation

## How to Use

### Step 1: Migrate from Main to Development

This is what you need to do right now to get your development branch up to date:

```bash
# Navigate to your project directory
cd /home/zone01student/Projects/MOSEHXL

# Run the migration from main to development
./scripts/run-migration.sh main-to-dev
```

This will:
- Check if PostgreSQL is running
- Create the development database if it doesn't exist
- Apply all schema changes from main to development
- Ask for confirmation before proceeding

### Step 2: Work on Development Branch

After the migration:
1. Switch to your development branch: `git checkout development`
2. Update your `.env` file to point to the development database
3. Test your features with mock data
4. Make schema changes as needed

### Step 3: Migrate from Development to Main

When you're ready to deploy new features:

1. **First, update the migration script**:
   - Edit `scripts/migrate-development-to-main.sql`
   - Add any new tables, columns, indexes, functions, or triggers you created
   - Follow the template examples in the file

2. **Test the migration**:
   ```bash
   # Create a test database
   createdb mosehxl_test
   
   # Run migration on test database
   psql -d mosehxl_test -f scripts/migrate-development-to-main.sql
   
   # Test your application with the test database
   ```

3. **Apply to production**:
   ```bash
   # Backup your production database first!
   pg_dump mosehxl_production > backup_$(date +%Y%m%d_%H%M%S).sql
   
   # Run the migration
   ./scripts/run-migration.sh dev-to-main
   ```

## Database Schema Overview

### Core Tables
- `categories` - Product categories
- `products` - Products with pricing and happy hour settings
- `orders` - Sales orders with tips and change tracking
- `order_items` - Individual items in orders
- `sub_bills` - Split payment tracking
- `users` - User authentication
- `permissions` - User permissions
- `user_permissions` - User-permission relationships
- `business_settings` - Business information for receipts

### Legal Compliance Tables
- `legal_journal` - Immutable transaction log (French fiscal compliance)
- `closure_bulletins` - Periodic data consolidation
- `audit_trail` - User action logging
- `archive_exports` - Long-term data preservation

## Recent Schema Changes

The main branch includes these recent additions:
- `tips` and `change` columns in `orders` table
- `tips_total` and `change_total` columns in `closure_bulletins` table
- `is_active` columns in `categories` and `products` tables
- Legal compliance tables for French fiscal requirements

## Troubleshooting

### Common Issues

1. **PostgreSQL not running**:
   ```bash
   sudo systemctl start postgresql
   ```

2. **Permission denied**:
   ```bash
   sudo -u postgres psql
   ```

3. **Database doesn't exist**:
   The migration script will create it automatically

4. **Migration fails**:
   - Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`
   - Restore from backup if needed
   - Check for syntax errors in the migration file

### Backup and Restore

**Create backup**:
```bash
pg_dump mosehxl_production > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restore from backup**:
```bash
psql -d mosehxl_production < backup_YYYYMMDD_HHMMSS.sql
```

## Best Practices

1. **Always backup before migrations**
2. **Test migrations on copy of production data**
3. **Keep migration scripts updated with all schema changes**
4. **Use descriptive commit messages when updating migration scripts**
5. **Document any complex schema changes**
6. **Never migrate data content, only structure**

## Environment Configuration

Make sure your `.env` files are configured correctly:

**Development**:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mosehxl_development
DB_USER=your_username
DB_PASSWORD=your_password
```

**Production**:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mosehxl_production
DB_USER=your_username
DB_PASSWORD=your_password
```

## Next Steps

1. Run the main-to-development migration now
2. Switch to development branch and test your application
3. Make any needed schema changes in development
4. Update the development-to-main migration script when ready
5. Test and deploy to production

Remember: The key is to keep your databases synchronized in structure but separate in content! 