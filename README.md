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
- **Status: FULLY COMPLIANT - Ready for AFNOR/LNE certification**

## 🔒 Security

- JWT authentication
- Role-based permissions
- Encrypted sensitive data
- Secure database connections

## 🧹 System Status & Maintenance

- **Current Status**: Fully operational and legally compliant
- **Hash Chain Integrity**: ✅ Valid (0 verification errors)
- **Legal Journal**: 130 entries with complete audit trail
- **Database**: Using `mosehxl_production` and `mosehxl_development` only
- **Backups**: Available in `backups/` directory

### Recent Improvements
- ✅ Fixed hash chain integrity verification
- ✅ Resolved timestamp format inconsistencies
- ✅ Cleaned up unused databases and scripts
- ✅ Updated documentation and compliance status

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
