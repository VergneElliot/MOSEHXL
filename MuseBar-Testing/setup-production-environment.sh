#!/bin/bash

echo "🏭 Setting up MuseBar Production Environment"
echo "============================================"

# Create production directory
PROD_DIR="/home/zone01student/Projects/MuseBar-Production"
TEST_DIR="/home/zone01student/Projects/MuseBar-Testing"

echo "📁 Creating production directory..."
cp -r /home/zone01student/Projects/MuseBar "$PROD_DIR"

echo "📁 Creating testing directory..."
cp -r /home/zone01student/Projects/MuseBar "$TEST_DIR"

echo "🗄️ Setting up production database..."
# Create production database
sudo -u postgres createdb musebar_production

echo "🗄️ Setting up testing database..."
# Create testing database
sudo -u postgres createdb musebar_testing

echo "⚙️ Configuring production environment..."
# Update production .env
cat > "$PROD_DIR/backend/.env" << EOF
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=musebar_production
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=production-secret-$(openssl rand -hex 16)
EOF

echo "⚙️ Configuring testing environment..."
# Update testing .env
cat > "$TEST_DIR/backend/.env" << EOF
NODE_ENV=testing
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_NAME=musebar_testing
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=testing-secret-$(openssl rand -hex 16)
EOF

echo "📋 Creating setup instructions..."
cat > "$PROD_DIR/PRODUCTION-SETUP.md" << EOF
# MuseBar Production Environment

## 🚨 CRITICAL: This is the PRODUCTION environment
- Use ONLY for real customer transactions
- DO NOT test features here
- DO NOT modify data manually

## Setup Steps:
1. Initialize the database: \`cd backend && node clean-reset-script.js\`
2. Start the server: \`cd backend && npm start\`
3. Access at: http://localhost:3001

## Database: musebar_production
## Port: 3001

## Legal Compliance:
- All transactions are legally binding
- Data cannot be modified once entered
- Daily closures are mandatory for compliance
EOF

cat > "$TEST_DIR/TESTING-SETUP.md" << EOF
# MuseBar Testing Environment

## 🧪 This is the TESTING environment
- Use for testing closure system
- Safe to add test transactions
- Can be reset without affecting production

## Setup Steps:
1. Initialize the database: \`cd backend && node clean-reset-script.js\`
2. Start the server: \`cd backend && npm start\`
3. Access at: http://localhost:3002

## Database: musebar_testing
## Port: 3002

## Testing Guidelines:
- Test closure functionality here first
- Add sample transactions to test with
- Verify everything works before using production
EOF

echo "✅ Environment setup complete!"
echo ""
echo "📁 Directories created:"
echo "   Production: $PROD_DIR"
echo "   Testing:    $TEST_DIR"
echo ""
echo "🗄️ Databases created:"
echo "   Production: musebar_production (port 3001)"
echo "   Testing:    musebar_testing (port 3002)"
echo ""
echo "📋 Next steps:"
echo "1. Initialize production database (clean start)"
echo "2. Initialize testing database (for testing closure system)"
echo "3. Test closure system in testing environment"
echo "4. Once validated, use production for real operations" 