# Cross-Platform Compatibility Issues and Solutions

## Overview

This document addresses the compatibility issues encountered when running the MuseBar system across different environments (Linux development vs Windows production) and provides solutions to ensure consistent behavior.

## Issues Identified

### 1. Closure Bulletin Data Inconsistencies

**Problem**: The closure bulletin totals were displaying incorrect data when running on the Windows PC at the bar.

**Root Causes**:
- **Schema Differences**: The development schema only supports `DAILY`, `MONTHLY`, and `ANNUAL` closure types, while production supports `WEEKLY` as well
- **Data Type Inconsistencies**: `tips_total` and `change_total` columns have different precision and constraint definitions between environments
- **Database Constraints**: Missing or inconsistent constraints between development and production schemas

**Specific Differences Found**:
```sql
-- Development Schema (scripts/schema_development.sql)
CONSTRAINT closure_bulletins_closure_type_check CHECK (
  closure_type IN ('DAILY', 'MONTHLY', 'ANNUAL')
);
tips_total numeric(12,2) DEFAULT 0 NOT NULL,
change_total numeric(12,2) DEFAULT 0 NOT NULL,

-- Production Schema (scripts/schema_production.sql)  
CONSTRAINT closure_bulletins_closure_type_check CHECK (
  closure_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL')
);
tips_total numeric DEFAULT 0,
change_total numeric DEFAULT 0,
```

### 2. Thermal Printing Issues

**Problem**: Thermal printing stopped working on the Windows PC.

**Root Causes**:
- **OS-Specific Commands**: The thermal print service was hardcoded to use Linux `lp` and `lpstat` commands
- **Temp Directory**: Hardcoded `/tmp` directory path not suitable for Windows
- **File Extensions**: Missing file extensions required for Windows printing

## Solutions Implemented

### 1. Schema Compatibility Fix

**File**: `scripts/fix-schema-compatibility.sql`

This script addresses all schema differences:

```sql
-- Add WEEKLY closure type to development schema
ALTER TABLE closure_bulletins DROP CONSTRAINT closure_bulletins_closure_type_check;
ALTER TABLE closure_bulletins ADD CONSTRAINT closure_bulletins_closure_type_check 
CHECK (closure_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'));

-- Fix data types for consistency
ALTER TABLE closure_bulletins 
ALTER COLUMN tips_total TYPE numeric(12,2),
ALTER COLUMN tips_total SET NOT NULL,
ALTER COLUMN tips_total SET DEFAULT 0;

ALTER TABLE closure_bulletins 
ALTER COLUMN change_total TYPE numeric(12,2),
ALTER COLUMN change_total SET NOT NULL,
ALTER COLUMN change_total SET DEFAULT 0;

-- Ensure proper constraints
ALTER TABLE closure_bulletins ADD CONSTRAINT tips_change_positive 
CHECK (tips_total >= 0 AND change_total >= 0);
```

**To apply the fix**:
```bash
# Run on both development and production databases
psql -d mosehxl_development -f scripts/fix-schema-compatibility.sql
psql -d mosehxl_production -f scripts/fix-schema-compatibility.sql
```

### 2. Cross-Platform Thermal Print Service

**File**: `MuseBar/backend/src/utils/thermalPrintService.ts`

**Key Improvements**:
- **OS Detection**: Automatically detects Windows vs Linux/Unix
- **Dynamic Commands**: Uses appropriate print commands for each OS
- **Flexible Temp Directory**: Uses OS-specific temp directory
- **Better Error Handling**: More robust error detection and reporting

**Windows Support**:
```typescript
private static readonly IS_WINDOWS = os.platform() === 'win32';
private static readonly TEMP_DIR = os.tmpdir(); // Uses OS temp directory

// Windows uses 'print' command, Linux uses 'lp'
const command = this.IS_WINDOWS ? 'print' : 'lp';
const args = this.IS_WINDOWS ? [filePath] : ['-d', this.PRINTER_NAME, filePath];
```

**Printer Status Checking**:
```typescript
// Windows: Use wmic to check printer status
// Linux: Use lpstat to check printer status
const command = this.IS_WINDOWS ? 'wmic' : 'lpstat';
const args = this.IS_WINDOWS 
  ? ['printer', 'where', `name="${this.PRINTER_NAME}"`, 'get', 'name,printerstatus', '/format:csv']
  : ['-p', this.PRINTER_NAME];
```

## Implementation Steps

### For Development Environment (Linux)

1. **Apply Schema Fix**:
   ```bash
   cd /home/zone01student/Projects/MOSEHXL
   psql -d mosehxl_development -f scripts/fix-schema-compatibility.sql
   ```

2. **Restart Backend**:
   ```bash
   cd MuseBar/backend
   npm run build
   npm start
   ```

### For Production Environment (Windows)

1. **Apply Schema Fix**:
   ```bash
   # Run on Windows PC
   psql -d mosehxl_production -f scripts/fix-schema-compatibility.sql
   ```

2. **Update Backend Code**:
   - The thermal print service will automatically detect Windows and use appropriate commands
   - No manual configuration needed

3. **Test Thermal Printing**:
   - Use the Settings page to test printer status
   - Try printing a test receipt

## Verification

### Schema Compatibility Check

Run the verification query from the fix script:
```sql
SELECT 
    'Schema Compatibility Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.check_constraints cc
            JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'closure_bulletins' 
            AND tc.constraint_name = 'closure_bulletins_closure_type_check'
            AND cc.check_clause LIKE '%WEEKLY%'
        ) THEN 'PASS' 
        ELSE 'FAIL' 
    END as weekly_type_check,
    -- ... other checks
```

### Thermal Printer Test

1. **Check Printer Status**:
   ```bash
   # Linux
   lpstat -p Oxhoo-TP85v-Network
   
   # Windows
   wmic printer where "name='Oxhoo-TP85v-Network'" get name,printerstatus
   ```

2. **Test Print Function**:
   - Use the Settings page "Test d'Impression" button
   - Check for successful test print

## Prevention Measures

### 1. Schema Synchronization

Always ensure both development and production schemas are synchronized:
- Use the migration scripts in `scripts/` directory
- Run schema compatibility checks regularly
- Keep backup copies of both schemas

### 2. Cross-Platform Testing

- Test thermal printing on both Linux and Windows
- Verify closure bulletin calculations on both environments
- Use the compatibility fix script when setting up new environments

### 3. Environment Detection

The system now automatically detects the operating environment:
- Database connection uses environment-specific defaults
- Thermal printing adapts to the OS
- Error messages are OS-appropriate

## Troubleshooting

### Closure Bulletin Issues

**Symptoms**: Incorrect totals, missing data, constraint violations

**Solutions**:
1. Run the schema compatibility fix script
2. Check database constraints: `\d closure_bulletins`
3. Verify data types: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'closure_bulletins';`

### Thermal Printing Issues

**Symptoms**: Print commands fail, printer not found

**Solutions**:
1. Check printer installation and drivers
2. Verify printer name matches configuration
3. Test with OS-specific commands manually
4. Check temp directory permissions

### Database Connection Issues

**Symptoms**: Connection refused, authentication failures

**Solutions**:
1. Verify database is running: `sudo systemctl status postgresql`
2. Check connection parameters in `config.js`
3. Ensure database exists: `psql -l`
4. Verify user permissions: `\du`

## Future Improvements

1. **Automated Schema Validation**: Regular checks to ensure schema consistency
2. **Cross-Platform Build Scripts**: Automated setup for different environments
3. **Enhanced Error Reporting**: More detailed error messages for troubleshooting
4. **Printer Configuration UI**: Allow printer name configuration through the web interface

## Support

For issues related to cross-platform compatibility:
1. Check this documentation first
2. Run the compatibility fix script
3. Verify schema consistency
4. Test thermal printing functionality
5. Contact system administrator if issues persist 