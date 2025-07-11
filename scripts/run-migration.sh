#!/bin/bash

# Database Migration Script for MOSEHXL
# This script helps you run database migrations safely

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if PostgreSQL is running
check_postgres() {
    if ! pg_isready -q; then
        print_error "PostgreSQL is not running. Please start PostgreSQL first."
        exit 1
    fi
    print_success "PostgreSQL is running"
}

# Function to check if database exists
check_database() {
    local db_name=$1
    if psql -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
        print_success "Database '$db_name' exists"
        return 0
    else
        print_warning "Database '$db_name' does not exist"
        return 1
    fi
}

# Function to create database if it doesn't exist
create_database() {
    local db_name=$1
    if ! check_database "$db_name"; then
        print_status "Creating database '$db_name'..."
        createdb "$db_name"
        print_success "Database '$db_name' created"
    fi
}

# Function to run migration
run_migration() {
    local migration_file=$1
    local database=$2
    
    if [ ! -f "$migration_file" ]; then
        print_error "Migration file '$migration_file' not found"
        exit 1
    fi
    
    print_status "Running migration: $migration_file"
    print_status "Target database: $database"
    
    # Ask for confirmation
    read -p "Do you want to proceed? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Migration cancelled by user"
        exit 0
    fi
    
    # Run the migration
    if psql -d "$database" -f "$migration_file"; then
        print_success "Migration completed successfully"
    else
        print_error "Migration failed"
        exit 1
    fi
}

# Main script
main() {
    echo "=========================================="
    echo "MOSEHXL Database Migration Tool"
    echo "=========================================="
    echo
    
    # Check PostgreSQL
    check_postgres
    
    # Parse command line arguments
    if [ $# -eq 0 ]; then
        echo "Usage: $0 <migration_type> [database_name]"
        echo ""
        echo "Migration types:"
        echo "  main-to-dev    - Migrate from main to development branch"
        echo "  dev-to-main    - Migrate from development to main branch"
        echo ""
        echo "Examples:"
        echo "  $0 main-to-dev"
        echo "  $0 main-to-dev mosehxl_development"
        echo "  $0 dev-to-main mosehxl_production"
        exit 1
    fi
    
    local migration_type=$1
    local database=${2:-""}
    
    case $migration_type in
        "main-to-dev")
            migration_file="scripts/migrate-main-to-development.sql"
            default_db="mosehxl_development"
            ;;
        "dev-to-main")
            migration_file="scripts/migrate-development-to-main.sql"
            default_db="mosehxl_production"
            print_warning "This will modify your PRODUCTION database!"
            print_warning "Make sure you have a backup before proceeding!"
            ;;
        *)
            print_error "Invalid migration type: $migration_type"
            echo "Valid types: main-to-dev, dev-to-main"
            exit 1
            ;;
    esac
    
    # Set database name
    if [ -z "$database" ]; then
        database=$default_db
    fi
    
    print_status "Migration type: $migration_type"
    print_status "Target database: $database"
    print_status "Migration file: $migration_file"
    echo
    
    # Create database if it doesn't exist
    create_database "$database"
    
    # Run the migration
    run_migration "$migration_file" "$database"
    
    echo
    print_success "Migration process completed!"
    echo
    echo "Next steps:"
    echo "1. Test your application with the migrated database"
    echo "2. Verify all features work correctly"
    echo "3. If issues occur, restore from backup and investigate"
}

# Run main function with all arguments
main "$@" 