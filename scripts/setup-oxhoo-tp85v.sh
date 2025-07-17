#!/bin/bash

# Oxhoo TP85v Thermal Printer Setup Script for Linux
# This script installs drivers and configures the Oxhoo TP85v thermal printer

echo "🖨️  Oxhoo TP85v Thermal Printer Setup"
echo "======================================"

# Check if CUPS is running
if ! systemctl is-active --quiet cups; then
    echo "❌ CUPS is not running. Starting CUPS..."
    sudo systemctl start cups
fi

echo "✅ CUPS is running"

# Install required packages
echo "📦 Installing required packages..."
sudo apt update
sudo apt install -y cups printer-driver-escpos printer-driver-escpr printer-driver-gutenprint

# Add user to lpadmin group
sudo usermod -aG lpadmin $USER

# Function to add USB printer
add_usb_printer() {
    local printer_name="Oxhoo-TP85v-Thermal"
    
    echo "🔧 Adding USB printer..."
    
    # Get USB device info
    local usb_info=$(lsusb | grep -i "oxhoo\|thermal\|printer")
    if [ -z "$usb_info" ]; then
        echo "❌ No Oxhoo printer detected via USB"
        echo "💡 Please connect the printer via USB and try again"
        return 1
    fi
    
    echo "✅ Found USB printer: $usb_info"
    
    # Add printer using CUPS
    sudo lpadmin -p "$printer_name" -E -v "usb://Oxhoo/TP85v" -m "drv:///sample.drv/generic.ppd"
    
    if [ $? -eq 0 ]; then
        echo "✅ USB printer added successfully!"
        configure_printer "$printer_name"
    else
        echo "❌ Failed to add USB printer"
        return 1
    fi
}

# Function to add network printer
add_network_printer() {
    local printer_ip=$1
    local printer_name="Oxhoo-TP85v-Network"
    
    echo "🔧 Adding network printer at IP: $printer_ip"
    
    # Add printer using CUPS
    sudo lpadmin -p "$printer_name" -E -v "socket://$printer_ip:9100" -m "drv:///sample.drv/generic.ppd"
    
    if [ $? -eq 0 ]; then
        echo "✅ Network printer added successfully!"
        configure_printer "$printer_name"
    else
        echo "❌ Failed to add network printer"
        return 1
    fi
}

# Function to configure printer settings
configure_printer() {
    local printer_name=$1
    
    echo "🔧 Configuring printer options..."
    
    # Set printer options for thermal receipt printing
    sudo lpoptions -p "$printer_name" -o PageSize=Custom.80x297mm
    sudo lpoptions -p "$printer_name" -o InputSlot=Auto
    sudo lpoptions -p "$printer_name" -o Resolution=203dpi
    sudo lpoptions -p "$printer_name" -o ColorModel=Gray
    sudo lpoptions -p "$printer_name" -o OutputMode=Normal
    
    # Enable the printer
    sudo cupsenable "$printer_name"
    sudo cupsaccept "$printer_name"
    
    echo "✅ Printer configured and enabled!"
    echo ""
    echo "📋 Printer Information:"
    echo "   Name: $printer_name"
    echo "   Type: Thermal Receipt Printer"
    echo "   Model: Oxhoo TP85v"
    echo ""
    echo "🌐 CUPS Web Interface: http://localhost:631"
    echo "📱 Test Print: lp -d $printer_name /etc/cups/testpage.pdf"
}

# Function to scan for network printer
scan_for_network_printer() {
    echo "🔍 Scanning for Oxhoo TP85v network printer..."
    
    # Common IP ranges for network printers
    local ip_ranges=("192.168.1" "192.168.0" "10.0.0" "172.16.0")
    
    for range in "${ip_ranges[@]}"; do
        echo "Scanning $range.0/24..."
        local found_ip=$(nmap -sn "$range.0/24" 2>/dev/null | grep -E "oxhoo|tp85v|thermal|printer" -B1 | grep -oE "$range\.[0-9]+" | head -1)
        
        if [ ! -z "$found_ip" ]; then
            echo "✅ Found printer at: $found_ip"
            add_network_printer "$found_ip"
            return 0
        fi
    done
    
    echo "❌ No network printer found"
    return 1
}

# Function to create ESC/POS test file
create_test_file() {
    local test_file="/tmp/oxhoo_test.txt"
    
    echo "📄 Creating ESC/POS test file..."
    
    cat > "$test_file" << 'EOF'
@
!0
Oxhoo TP85v Test Print
========================

Date: $(date)
Time: $(date +%H:%M:%S)

This is a test print from the
Oxhoo TP85v thermal printer.

Features:
- 80mm paper width
- Thermal printing
- ESC/POS compatible
- Network/USB support

========================
Test completed successfully!
@
EOF

    echo "✅ Test file created: $test_file"
    return "$test_file"
}

# Function to test printer with ESC/POS commands
test_printer_escpos() {
    local printer_name=$1
    local test_file="/tmp/oxhoo_test.txt"
    
    echo "🧪 Testing printer with ESC/POS commands..."
    
    # Create test file
    create_test_file
    
    # Send to printer
    if lp -d "$printer_name" "$test_file"; then
        echo "✅ Test print sent successfully!"
    else
        echo "❌ Failed to send test print"
    fi
}

# Main script
echo ""
echo "Choose an option:"
echo "1. Add USB printer (connect via USB first)"
echo "2. Add network printer with specific IP"
echo "3. Scan for network printer automatically"
echo "4. Open CUPS web interface"
echo "5. Test printer with ESC/POS commands"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        add_usb_printer
        ;;
    2)
        read -p "Enter printer IP address: " printer_ip
        add_network_printer "$printer_ip"
        ;;
    3)
        scan_for_network_printer
        ;;
    4)
        echo "🌐 Opening CUPS web interface..."
        xdg-open http://localhost:631 &
        ;;
    5)
        read -p "Enter printer name: " printer_name
        test_printer_escpos "$printer_name"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "💡 Tips for Oxhoo TP85v:"
echo "   - Connect via USB for initial setup"
echo "   - Use ESC/POS commands for direct control"
echo "   - Default network port is 9100"
echo "   - Paper width: 80mm"
echo "   - Resolution: 203 DPI"
echo "   - Check printer manual for network configuration"
echo ""
echo "🔧 If printer not detected:"
echo "   - Check USB connection"
echo "   - Try different USB ports"
echo "   - Check printer power and status"
echo "   - Install additional drivers if needed" 