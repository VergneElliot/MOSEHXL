# MOSEHXL Development Guide

This guide explains how to work with the MOSEHXL project's dual-environment setup.

## 🌿 Branch Structure

### main (Production Branch)
- **Purpose**: Stable, legally compliant production code
- **Database**: `mosehxl_production`
- **Usage**: Real-world MuseBar operations
- **Restrictions**: 
  - No direct development
  - Legal journal is immutable
  - Automatic closure scheduler active
  - All changes require thorough testing

### development (Development Branch)
- **Purpose**: Active development and testing
- **Database**: `mosehxl_development`
- **Usage**: Feature development, testing, experimentation
- **Freedom**: 
  - Safe to break things
  - Database can be reset
  - Relaxed legal compliance for testing

## 🚀 Quick Start

### First-time Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/VergneElliot/MOSEHXL.git
   cd MOSEHXL
   ```

2. **Initialize databases**
   ```bash
   # Connect to PostgreSQL as superuser
   psql -U postgres -f scripts/init-database.sql
   ```

3. **Set up development environment**
   ```bash
   ./scripts/setup-development.sh
   ```

### Daily Development Workflow

1. **Always start on development branch**
   ```bash
   git checkout development
   git pull origin development
   ```

2. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd MuseBar/backend
   NODE_ENV=development npm run dev
   
   # Terminal 2: Frontend
   cd MuseBar
   npm start
   ```

3. **Work on features, commit regularly**
   ```bash
   git add .
   git commit -m "Add feature: description"
   git push origin development
   ```

## 🔄 Environment Switching

### Switch to Development
```bash
git checkout development
export NODE_ENV=development
export DB_NAME=mosehxl_development
```

### Switch to Production
```bash
git checkout main
export NODE_ENV=production
export DB_NAME=mosehxl_production
```

## 📋 Development Rules

### ✅ DO
- Work exclusively on `development` branch
- Test features thoroughly before merging
- Use development database for all testing
- Commit frequently with clear messages
- Create pull requests for main branch merges
- Document new features and changes

### ❌ DON'T
- Never commit directly to `main` branch
- Never test on production database
- Don't merge untested code to main
- Don't disable legal compliance without reason
- Don't modify legal journal in production

## 🗄️ Database Management

### Development Database
- **Safe to reset**: `dropdb mosehxl_development && createdb mosehxl_development`
- **Load test data**: Use sample data for testing
- **Experiment freely**: Try new features, break things

### Production Database
- **NEVER RESET**: Contains legally required immutable records
- **Backup regularly**: Critical business data
- **Monitor integrity**: Legal journal must remain valid

## 🧪 Testing Workflow

1. **Feature Development**
   ```bash
   git checkout development
   # Develop feature
   # Test locally
   git commit -m "Feature: new functionality"
   ```

2. **Pre-production Testing**
   ```bash
   # Test on development with production-like data
   # Verify legal compliance features
   # Check all user workflows
   ```

3. **Production Deployment**
   ```bash
   git checkout main
   git merge development
   ./scripts/setup-production.sh
   # Deploy to production server
   ```

## 🔒 Legal Compliance Considerations

### Development Environment
- Legal journal enabled but can be reset
- Relaxed validation for testing
- Debug features available
- Hash chain verification active

### Production Environment
- Strict legal compliance enforced
- Immutable legal journal with hash chain integrity
- Full audit trail required (130 entries verified)
- French CGI Article 286-I-3 bis compliance
- **Status: FULLY COMPLIANT - Ready for certification**

## 🚨 Emergency Procedures

### Development Issues
- Reset database: `./scripts/setup-development.sh`
- Switch branches: `git checkout development`
- Clean install: Delete `node_modules`, run `npm install`

### Production Issues
- **NEVER** reset production database
- Check logs: Review backend.log and debug.log
- Rollback: `git checkout main` and redeploy last known good version
- Contact system administrator for critical issues

## 📞 Support

For questions about:
- **Development**: Create GitHub issue or discussion
- **Production**: Contact Elliot Vergne directly
- **Legal Compliance**: Consult with legal team before changes 