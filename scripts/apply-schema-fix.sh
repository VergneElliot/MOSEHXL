#!/bin/bash

# Apply Schema Compatibility Fix Script
# This script applies the schema compatibility fixes to ensure consistent behavior
# across development and production environments

set -e  # Exit on any error

echo "🔧 MuseBar Schema Compatibility Fix"
echo "=================================="

# Function to check if PostgreSQL is running
check_postgres() {
    if ! pg_isready -q; then
        echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
        exit 1
    fi
    echo "✅ PostgreSQL is running"
}

# Function to check if database exists
check_database() {
    local db_name=$1
    if ! psql -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
        echo "❌ Database '$db_name' does not exist"
        return 1
    fi
    echo "✅ Database '$db_name' exists"
    return 0
}

# Function to apply schema fix to a database
apply_fix() {
    local db_name=$1
    local env_name=$2
    
    echo ""
    echo "📊 Applying schema fix to $env_name database ($db_name)..."
    
    if check_database "$db_name"; then
        echo "🔄 Running schema compatibility fix..."
        psql -d "$db_name" -f scripts/fix-schema-compatibility.sql
        
        if [ $? -eq 0 ]; then
            echo "✅ Schema fix applied successfully to $env_name"
        else
            echo "❌ Failed to apply schema fix to $env_name"
            return 1
        fi
    else
        echo "⚠️  Skipping $env_name database (not found)"
        return 1
    fi
}

# Function to verify the fix
verify_fix() {
    local db_name=$1
    local env_name=$2
    
    echo ""
    echo "🔍 Verifying schema fix for $env_name..."
    
    # Check if WEEKLY closure type is supported
    local weekly_check=$(psql -d "$db_name" -t -c "
        SELECT EXISTS (
            SELECT 1 FROM information_schema.check_constraints cc
            JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'closure_bulletins' 
            AND tc.constraint_name = 'closure_bulletins_closure_type_check'
            AND cc.check_clause LIKE '%WEEKLY%'
        );
    " | xargs)
    
    if [ "$weekly_check" = "t" ]; then
        echo "✅ WEEKLY closure type is supported"
    else
        echo "❌ WEEKLY closure type is NOT supported"
    fi
    
    # Check tips_total data type
    local tips_check=$(psql -d "$db_name" -t -c "
        SELECT data_type, numeric_precision, numeric_scale, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'closure_bulletins' AND column_name = 'tips_total';
    " | xargs)
    
    if echo "$tips_check" | grep -q "numeric.*12.*2.*NO"; then
        echo "✅ tips_total has correct data type (numeric(12,2) NOT NULL)"
    else
        echo "❌ tips_total data type needs fixing"
    fi
    
    # Check change_total data type
    local change_check=$(psql -d "$db_name" -t -c "
        SELECT data_type, numeric_precision, numeric_scale, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'closure_bulletins' AND column_name = 'change_total';
    " | xargs)
    
    if echo "$change_check" | grep -q "numeric.*12.*2.*NO"; then
        echo "✅ change_total has correct data type (numeric(12,2) NOT NULL)"
    else
        echo "❌ change_total data type needs fixing"
    fi
}

# Main script
main() {
    echo "Checking prerequisites..."
    check_postgres
    
    # Try to apply fix to development database
    if apply_fix "mosehxl_development" "development"; then
        verify_fix "mosehxl_development" "development"
    fi
    
    # Try to apply fix to production database
    if apply_fix "mosehxl_production" "production"; then
        verify_fix "mosehxl_production" "production"
    fi
    
    echo ""
    echo "🎉 Schema compatibility fix completed!"
    echo ""
    echo "Next steps:"
    echo "1. Restart the backend server"
    echo "2. Test closure bulletin functionality"
    echo "3. Test thermal printing (if applicable)"
    echo ""
    echo "For more information, see: CROSS-PLATFORM-COMPATIBILITY.md"
}

# Run main function
main "$@" 