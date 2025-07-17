#!/bin/bash

# Epson M362A Thermal Printer Setup Script
# This script helps add the Epson M362A thermal printer to CUPS

echo "🖨️  Epson M362A Thermal Printer Setup"
echo "======================================"

# Check if CUPS is running
if ! systemctl is-active --quiet cups; then
    echo "❌ CUPS is not running. Starting CUPS..."
    sudo systemctl start cups
fi

echo "✅ CUPS is running"

# Function to add printer with specific IP
add_printer_with_ip() {
    local printer_ip=$1
    local printer_name="Epson-M362A-Thermal"
    
    echo "🔧 Adding printer at IP: $printer_ip"
    
    # Add the printer using CUPS
    sudo lpadmin -p "$printer_name" -E -v "socket://$printer_ip:9100" -m "drv:///sample.drv/generic.ppd"
    
    if [ $? -eq 0 ]; then
        echo "✅ Printer added successfully!"
        echo "🔧 Setting printer options..."
        
        # Set printer options for thermal receipt printing
        sudo lpoptions -p "$printer_name" -o PageSize=Custom.80x297mm
        sudo lpoptions -p "$printer_name" -o InputSlot=Auto
        sudo lpoptions -p "$printer_name" -o Resolution=203dpi
        
        # Enable the printer
        sudo cupsenable "$printer_name"
        sudo cupsaccept "$printer_name"
        
        echo "✅ Printer configured and enabled!"
        echo ""
        echo "📋 Printer Information:"
        echo "   Name: $printer_name"
        echo "   IP: $printer_ip"
        echo "   Port: 9100"
        echo "   Type: Thermal Receipt Printer"
        echo ""
        echo "🌐 CUPS Web Interface: http://localhost:631"
        echo "📱 Test Print: lp -d $printer_name /etc/cups/testpage.pdf"
        
        return 0
    else
        echo "❌ Failed to add printer"
        return 1
    fi
}

# Function to scan for printer
scan_for_printer() {
    echo "🔍 Scanning for Epson M362A printer..."
    
    # Common IP ranges for network printers
    local ip_ranges=("192.168.1" "192.168.0" "10.0.0" "172.16.0")
    
    for range in "${ip_ranges[@]}"; do
        echo "Scanning $range.0/24..."
        local found_ip=$(nmap -sn "$range.0/24" 2>/dev/null | grep -E "Epson|M362A|printer" -B1 | grep -oE "$range\.[0-9]+" | head -1)
        
        if [ ! -z "$found_ip" ]; then
            echo "✅ Found printer at: $found_ip"
            add_printer_with_ip "$found_ip"
            return 0
        fi
    done
    
    echo "❌ No printer found in common IP ranges"
    return 1
}

# Main script
echo ""
echo "Choose an option:"
echo "1. Scan for printer automatically"
echo "2. Add printer with specific IP"
echo "3. Open CUPS web interface"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        scan_for_printer
        ;;
    2)
        read -p "Enter printer IP address: " printer_ip
        add_printer_with_ip "$printer_ip"
        ;;
    3)
        echo "🌐 Opening CUPS web interface..."
        xdg-open http://localhost:631 &
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "💡 Tips:"
echo "   - Make sure the printer is powered on and connected"
echo "   - Check the printer's network status page for IP address"
echo "   - Try connecting via USB first to configure network settings"
echo "   - Some printers need to be configured via their web interface" 