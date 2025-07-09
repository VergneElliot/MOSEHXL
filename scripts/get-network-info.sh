#!/bin/bash

# MuseBar Network Setup Helper
# This script helps detect your local network IP for multi-device access

echo "📱 MuseBar - Network Setup Helper"
echo "=================================="
echo ""

# Function to get the primary local IP
get_local_ip() {
    # Try different methods to get local IP
    local ip=""
    
    # Method 1: hostname -I (Linux)
    if command -v hostname >/dev/null 2>&1; then
        ip=$(hostname -I | awk '{print $1}' 2>/dev/null)
    fi
    
    # Method 2: ip route (Linux)
    if [[ -z "$ip" ]] && command -v ip >/dev/null 2>&1; then
        ip=$(ip route get 8.8.8.8 | awk '{print $7; exit}' 2>/dev/null)
    fi
    
    # Method 3: ifconfig (Linux/macOS)
    if [[ -z "$ip" ]] && command -v ifconfig >/dev/null 2>&1; then
        ip=$(ifconfig | grep -E "inet.*192\.168\.|inet.*10\.|inet.*172\." | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    fi
    
    echo "$ip"
}

# Function to check if a port is available
check_port() {
    local port=$1
    if command -v netstat >/dev/null 2>&1; then
        netstat -tuln | grep ":$port " >/dev/null 2>&1
        return $?
    elif command -v ss >/dev/null 2>&1; then
        ss -tuln | grep ":$port " >/dev/null 2>&1
        return $?
    else
        return 1
    fi
}

# Get network information
LOCAL_IP=$(get_local_ip)

if [[ -z "$LOCAL_IP" ]]; then
    echo "❌ Unable to detect local IP address"
    echo "Please manually find your IP address using:"
    echo "   Linux: hostname -I"
    echo "   macOS: ifconfig | grep inet"
    echo "   Windows: ipconfig"
    exit 1
fi

echo "🌐 Network Information:"
echo "   Local IP: $LOCAL_IP"
echo ""

# Check backend port
echo "🔍 Checking backend status..."
if check_port 3001; then
    echo "✅ Backend port 3001 is in use (likely running)"
else
    echo "❌ Backend port 3001 is not in use"
    echo "   Make sure to start the backend with: cd MuseBar/backend && npm run dev"
fi

# Check frontend port
echo ""
echo "🔍 Checking frontend status..."
if check_port 3000; then
    echo "✅ Frontend port 3000 is in use (likely running)"
else
    echo "❌ Frontend port 3000 is not in use"
    echo "   Make sure to start the frontend with: cd MuseBar && npm start"
fi

echo ""
echo "📱 Device Access URLs:"
echo "======================================"
echo "🖥️  This Computer:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "📱 Other Devices (phones, tablets, cash registers):"
echo "   Frontend: http://$LOCAL_IP:3000"
echo "   Backend:  http://$LOCAL_IP:3001"
echo ""

echo "🔧 Setup Instructions:"
echo "================================="
echo "1. Make sure both backend and frontend are running"
echo "2. On other devices, connect to the same WiFi network"
echo "3. Open a web browser and navigate to: http://$LOCAL_IP:3000"
echo "4. The system will automatically detect and connect to the backend"
echo ""

echo "🔐 Firewall Notes:"
echo "================================="
echo "If devices can't connect, you may need to:"
echo "   • Allow ports 3000 and 3001 through your firewall"
echo "   • On Ubuntu/Linux: sudo ufw allow 3000 && sudo ufw allow 3001"
echo "   • On Windows: Add rules in Windows Defender Firewall"
echo "   • On macOS: System Preferences > Security & Privacy > Firewall"
echo ""

echo "✅ Setup complete! Happy serving! 🍺" 