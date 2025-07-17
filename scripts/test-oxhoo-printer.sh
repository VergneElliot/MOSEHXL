#!/bin/bash

# Test script for Oxhoo TP85v thermal printer
# This script sends ESC/POS commands to test the printer

echo "🧪 Testing Oxhoo TP85v Thermal Printer"
echo "======================================"

# Create test file with ESC/POS commands
cat > /tmp/oxhoo_test.txt << 'EOF'
@
!0
a1
    Oxhoo TP85v Test Print
    ========================

Date: $(date +%Y-%m-%d)
Time: $(date +%H:%M:%S)

This is a test print from the
Oxhoo TP85v thermal printer.

Features:
- 80mm paper width
- Thermal printing
- ESC/POS compatible
- Network support

========================
Test completed successfully!
@
EOF

echo "📄 Test file created with ESC/POS commands"

# Test the printer
if lp -d Oxhoo-TP85v-Network /tmp/oxhoo_test.txt; then
    echo "✅ Test print sent successfully!"
    echo "📱 Check the printer for output"
else
    echo "❌ Failed to send test print"
    echo "🔧 Checking printer status..."
    lpstat -p Oxhoo-TP85v-Network
fi

echo ""
echo "🌐 CUPS Web Interface: http://localhost:631"
echo "📋 Printer Status: lpstat -p Oxhoo-TP85v-Network" 