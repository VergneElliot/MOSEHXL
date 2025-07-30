# MOSEHXL - Point of Sale & Bar Management System

A comprehensive POS system with legal compliance features for bars, restaurants, and hospitality businesses.

## 🚀 Features

- **Point of Sale (POS)** - Complete transaction management
- **Legal Compliance** - French legal requirements (CGI Article 286-I-3 bis)
- **Inventory Management** - Products, categories, and stock tracking
- **User Management** - Role-based access control
- **Audit Trail** - Complete transaction history and legal journal
- **Happy Hour Management** - Automated price adjustments
- **Closure Management** - Daily closure with legal compliance

## 📁 Project Structure

```
MOSEHXL/
├── MuseBar/                 # Main application (Production-ready)
│   ├── backend/            # Node.js/Express API server
│   └── src/               # React frontend
└── README.md
```

## 🌿 Branches

- **main** - Production branch (stable, legally compliant)
- **development** - Development branch (new features, testing)

## 🚀 Quick Deployment to Production

For detailed step-by-step deployment instructions, see **[DEPLOYMENT-GUIDE-STEP-BY-STEP.md](./DEPLOYMENT-GUIDE-STEP-BY-STEP.md)**.

### Option 1: DigitalOcean (Recommended - $27/month)
- 2 months FREE with $200 credit
- Automated deployment script included
- Professional SSL setup
- Managed database with backups

### Option 2: Railway ($5-15/month)
- Git-based deployment
- Auto-scaling
- Built-in database

### Option 3: Free Tier (Render + Supabase)
- Start free, scale when needed
- Great for testing and development

## 🛠️ Development Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v13+)
- Git

### Production Environment
```bash
cd MuseBar/backend
npm install
npm start
```

### Development Environment
```bash
git checkout development
cd MuseBar/backend
npm install
npm run dev
```

## 🗄️ Database Setup

### Production Database
- Database: `mosehxl_production`
- Port: 5432
- Ensure legal journal integrity

### Development Database  
- Database: `mosehxl_development`
- Port: 5432
- Safe for testing and experimentation

## 📄 Legal Compliance

This system maintains full legal compliance with French regulations (Article 286-I-3 bis du CGI):
- ✅ Immutable legal journal with hash chain integrity
- ✅ Sequential transaction recording (130 entries verified)
- ✅ Complete audit trail preservation
- ✅ Real-time data integrity verification
- ✅ ISCA pillars implementation (Inaltérabilité, Sécurisation, Conservation, Archivage)
- ✅ Receipt generation with all mandatory information
- ✅ **FULLY COMPLIANT** - Ready for AFNOR/LNE certification

### French Cashier Regulations Compliance
The system implements all four ISCA pillars required by French law:

1. **Inaltérabilité** (Immutability): Immutable legal journal with cryptographic hash chain
2. **Sécurisation** (Security): Complete audit trail and access controls
3. **Conservation** (Preservation): Daily closure bulletins and data integrity
4. **Archivage** (Archiving): Secure export functionality with digital signatures

**Risk Assessment**: LOW RISK - System fully compliant with current regulations
**Certification Status**: Ready for AFNOR NF525 and LNE certification
**Fine Risk**: €7,500 per non-compliant register (system is compliant)

See `FRENCH_CASHIER_COMPLIANCE_ANALYSIS.md` for detailed compliance documentation.

## 🔒 Security

- JWT authentication
- Role-based permissions
- Encrypted sensitive data
- Secure database connections

## 🧹 System Status & Maintenance

- **Current Status**: ✅ Fully operational and legally compliant
- **Hash Chain Integrity**: ✅ Valid (0 verification errors)
- **Legal Journal**: 130 entries with complete audit trail
- **Cross-Platform Compatibility**: ✅ Fixed (Linux/Windows compatibility issues resolved)

## 🔧 Cross-Platform Compatibility

The system now supports consistent operation across different environments:

### Recent Fixes Applied
- **Schema Compatibility**: Fixed differences between development and production databases
- **Thermal Printing**: Cross-platform support for Linux and Windows
- **Data Type Consistency**: Standardized numeric precision and constraints

### Quick Fix Application
```bash
# Apply schema compatibility fixes
./scripts/apply-schema-fix.sh

# Restart backend after applying fixes
cd MuseBar/backend
npm run build
npm start
```

For detailed information about cross-platform compatibility issues and solutions, see `CROSS-PLATFORM-COMPATIBILITY.md`.
- **Database**: Using `mosehxl_production` and `mosehxl_development` only
- **Database Structure**: ✅ Successfully cloned (July 24, 2025)
- **Backups**: Available in `backups/` directory
- **Project Status**: ✅ Clean and optimized (July 24, 2025)

### Maintenance Guidelines
- Always backup before major operations
- Test changes on development branch first
- Maintain legal compliance in all modifications
- Monitor hash chain integrity regularly

## 📝 README Maintenance

This README will be kept up to date with all major operational, legal, or production changes. If you add new features, compliance requirements, or perform a major data operation, please update this file accordingly.

## 📝 License

Copyright (c) 2024 Elliot Vergne. All rights reserved.
This software is proprietary and confidential.

## 🤝 Contributing

This is a proprietary project. Development guidelines:
1. Always work on `development` branch
2. Test thoroughly before merging to `main`
3. Maintain legal compliance in all features
4. Follow TypeScript best practices

---
**Note**: The `main` branch contains the production-ready system currently in use. All development work should be done on the `development` branch to maintain production stability.
