#!/bin/bash

# Fix Closure Validation Logic
# This script deploys the fix for the closure validation issue

echo "🔧 Deploying closure validation fix..."

# Navigate to the project directory
cd /home/zone01student/Projects/MOSEHXL

# Backup the current legalJournal.ts file
echo "📋 Creating backup of current legalJournal.ts..."
cp MuseBar/backend/src/models/legalJournal.ts backups/legalJournal_backup_$(date +%Y%m%d_%H%M%S).ts

# Apply the fix to the deployed server
echo "🚀 Deploying fix to cloud server..."

# Copy the fixed file to the server
scp MuseBar/backend/src/models/legalJournal.ts root@209.38.223.91:/root/MuseBar/backend/src/models/legalJournal.ts

# Restart the backend service on the server
echo "🔄 Restarting backend service..."
ssh root@209.38.223.91 << 'EOF'
cd /root/MuseBar
npm run build
pm2 restart museBar-backend
echo "✅ Backend restarted successfully"
EOF

echo "✅ Closure validation fix deployed successfully!"
echo ""
echo "📝 Summary of changes:"
echo "- Fixed closure validation logic to check for specific business day instead of overlapping time periods"
echo "- Now correctly validates that a closure for July 30th doesn't conflict with July 29th's closure"
echo "- The system will now allow creating a closure for July 30th (2AM July 30th to 2AM July 31st)"
echo ""
echo "🎯 You can now try creating a closure for July 30th again!" 