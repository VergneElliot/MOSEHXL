#!/bin/bash

# 🚀 MuseBar POS - SSH Key & Domain Setup Script
# This script helps you set up SSH key authentication and configure a domain name

set -e

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get user input with default
get_input() {
    local prompt="$1"
    local default="$2"
    local input
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " input
        echo "${input:-$default}"
    else
        read -p "$prompt: " input
        echo "$input"
    fi
}

# Function to validate IP address
validate_ip() {
    local ip=$1
    if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        OIFS=$IFS
        IFS='.'
        ip=($ip)
        IFS=$OIFS
        [[ ${ip[0]} -le 255 && ${ip[1]} -le 255 && ${ip[2]} -le 255 && ${ip[3]} -le 255 ]]
        return $?
    else
        return 1
    fi
}

# Function to validate domain
validate_domain() {
    local domain=$1
    if [[ $domain =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Main menu
show_menu() {
    echo
    echo "=========================================="
    echo "🚀 MuseBar POS - SSH & Domain Setup"
    echo "=========================================="
    echo
    echo "1. Generate SSH Key Pair"
    echo "2. Add SSH Key to DigitalOcean"
    echo "3. Configure SSH Key Authentication"
    echo "4. Set Up Domain Name"
    echo "5. Configure SSL Certificate"
    echo "6. Update Application for Domain"
    echo "7. Test Domain Configuration"
    echo "8. Complete Setup (All Steps)"
    echo "9. Exit"
    echo
}

# Step 1: Generate SSH Key Pair
generate_ssh_key() {
    print_status "Step 1: Generating SSH Key Pair"
    
    # Check if SSH key already exists
    if [ -f ~/.ssh/id_rsa ]; then
        print_warning "SSH key already exists at ~/.ssh/id_rsa"
        local overwrite=$(get_input "Do you want to overwrite it? (y/N)" "N")
        if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
            print_status "Using existing SSH key"
            return 0
        fi
    fi
    
    # Generate SSH key
    print_status "Generating new SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N "" -C "musebar-production"
    
    if [ $? -eq 0 ]; then
        print_success "SSH key pair generated successfully!"
        print_status "Public key location: ~/.ssh/id_rsa.pub"
        print_status "Private key location: ~/.ssh/id_rsa"
    else
        print_error "Failed to generate SSH key pair"
        return 1
    fi
    
    # Display public key
    echo
    print_status "Your public key (add this to DigitalOcean):"
    echo "----------------------------------------"
    cat ~/.ssh/id_rsa.pub
    echo "----------------------------------------"
    echo
}

# Step 2: Add SSH Key to DigitalOcean
add_ssh_key_to_digitalocean() {
    print_status "Step 2: Adding SSH Key to DigitalOcean"
    
    if [ ! -f ~/.ssh/id_rsa.pub ]; then
        print_error "SSH public key not found. Please generate one first."
        return 1
    fi
    
    echo
    print_status "To add your SSH key to DigitalOcean:"
    echo "1. Go to https://cloud.digitalocean.com/account/security/ssh"
    echo "2. Click 'Add SSH Key'"
    echo "3. Give it a name (e.g., 'MuseBar Production')"
    echo "4. Copy and paste your public key:"
    echo
    cat ~/.ssh/id_rsa.pub
    echo
    print_status "5. Click 'Add SSH Key'"
    echo
    read -p "Press Enter when you've added the SSH key to DigitalOcean..."
}

# Step 3: Configure SSH Key Authentication
configure_ssh_authentication() {
    print_status "Step 3: Configuring SSH Key Authentication"
    
    local server_ip=$(get_input "Enter your DigitalOcean server IP address")
    
    if ! validate_ip "$server_ip"; then
        print_error "Invalid IP address format"
        return 1
    fi
    
    print_status "Testing SSH connection to $server_ip..."
    
    # Test SSH connection
    if ssh -o ConnectTimeout=10 -o BatchMode=yes root@$server_ip exit 2>/dev/null; then
        print_success "SSH key authentication is working!"
    else
        print_warning "SSH key authentication failed. You may need to:"
        echo "1. Make sure the SSH key is added to DigitalOcean"
        echo "2. Try connecting with password first: ssh root@$server_ip"
        echo "3. Check if the server is accessible"
        return 1
    fi
}

# Step 4: Set Up Domain Name
setup_domain() {
    print_status "Step 4: Setting Up Domain Name"
    
    local domain=$(get_input "Enter your domain name (e.g., yourbarname.com)")
    
    if ! validate_domain "$domain"; then
        print_error "Invalid domain name format"
        return 1
    fi
    
    local server_ip=$(get_input "Enter your DigitalOcean server IP address")
    
    if ! validate_ip "$server_ip"; then
        print_error "Invalid IP address format"
        return 1
    fi
    
    echo
    print_status "Domain Setup Instructions:"
    echo "================================"
    echo
    echo "1. Register your domain at a registrar (e.g., Namecheap, GoDaddy)"
    echo "2. Point your domain to your server:"
    echo
    echo "   Add these DNS records:"
    echo "   - Type: A Record"
    echo "   - Host: @"
    echo "   - Value: $server_ip"
    echo "   - TTL: 5 minutes"
    echo
    echo "   - Type: A Record"
    echo "   - Host: www"
    echo "   - Value: $server_ip"
    echo "   - TTL: 5 minutes"
    echo
    echo "3. Wait 15-30 minutes for DNS propagation"
    echo
    read -p "Press Enter when you've configured your domain DNS..."
    
    # Save domain info for later use
    echo "DOMAIN=$domain" > ~/.musebar-domain
    echo "SERVER_IP=$server_ip" >> ~/.musebar-domain
    
    print_success "Domain configuration saved!"
}

# Step 5: Configure SSL Certificate
configure_ssl() {
    print_status "Step 5: Configuring SSL Certificate"
    
    if [ ! -f ~/.musebar-domain ]; then
        print_error "Domain configuration not found. Please set up domain first."
        return 1
    fi
    
    source ~/.musebar-domain
    
    if [ -z "$DOMAIN" ] || [ -z "$SERVER_IP" ]; then
        print_error "Domain or server IP not found in configuration"
        return 1
    fi
    
    print_status "Connecting to server to configure SSL..."
    
    # SSH to server and configure SSL
    ssh root@$SERVER_IP << EOF
        # Update Nginx configuration
        sed -i "s/server_name _;/server_name $DOMAIN www.$DOMAIN;/" /etc/nginx/sites-available/musebar
        
        # Test Nginx configuration
        nginx -t
        
        # Reload Nginx
        systemctl reload nginx
        
        # Install Certbot if not already installed
        if ! command -v certbot >/dev/null 2>&1; then
            apt update
            apt install -y certbot python3-certbot-nginx
        fi
        
        # Get SSL certificate
        certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
        
        # Test SSL configuration
        curl -I https://$DOMAIN
EOF
    
    if [ $? -eq 0 ]; then
        print_success "SSL certificate configured successfully!"
    else
        print_error "Failed to configure SSL certificate"
        return 1
    fi
}

# Step 6: Update Application for Domain
update_application_for_domain() {
    print_status "Step 6: Updating Application for Domain"
    
    if [ ! -f ~/.musebar-domain ]; then
        print_error "Domain configuration not found. Please set up domain first."
        return 1
    fi
    
    source ~/.musebar-domain
    
    if [ -z "$DOMAIN" ] || [ -z "$SERVER_IP" ]; then
        print_error "Domain or server IP not found in configuration"
        return 1
    fi
    
    print_status "Connecting to server to update application..."
    
    # SSH to server and update application
    ssh root@$SERVER_IP << EOF
        # Update backend CORS origin
        cd /var/www/MOSEHXL/MuseBar/backend
        sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN|" .env
        
        # Update frontend API URL
        cd /var/www/MOSEHXL/MuseBar
        echo "REACT_APP_API_URL=https://$DOMAIN/api" > .env.production
        
        # Rebuild frontend
        npm run build
        
        # Restart backend
        cd /var/www/MOSEHXL/MuseBar/backend
        pm2 restart musebar-backend
        
        # Restart frontend
        cd /var/www/MOSEHXL
        pm2 restart musebar-frontend
EOF
    
    if [ $? -eq 0 ]; then
        print_success "Application updated for domain successfully!"
    else
        print_error "Failed to update application for domain"
        return 1
    fi
}

# Step 7: Test Domain Configuration
test_domain_configuration() {
    print_status "Step 7: Testing Domain Configuration"
    
    if [ ! -f ~/.musebar-domain ]; then
        print_error "Domain configuration not found. Please set up domain first."
        return 1
    fi
    
    source ~/.musebar-domain
    
    if [ -z "$DOMAIN" ]; then
        print_error "Domain not found in configuration"
        return 1
    fi
    
    print_status "Testing domain accessibility..."
    
    # Test HTTP
    if curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN | grep -q "200\|301\|302"; then
        print_success "HTTP access working!"
    else
        print_warning "HTTP access may not be working yet"
    fi
    
    # Test HTTPS
    if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
        print_success "HTTPS access working!"
    else
        print_warning "HTTPS access may not be working yet"
    fi
    
    echo
    print_status "You can now access your MuseBar POS at:"
    echo "🌐 https://$DOMAIN"
    echo
}

# Complete Setup (All Steps)
complete_setup() {
    print_status "Running complete setup..."
    
    generate_ssh_key
    add_ssh_key_to_digitalocean
    configure_ssh_authentication
    setup_domain
    configure_ssl
    update_application_for_domain
    test_domain_configuration
    
    print_success "Complete setup finished!"
    echo
    print_status "Your MuseBar POS is now configured with:"
    echo "✅ SSH key authentication"
    echo "✅ Domain name"
    echo "✅ SSL certificate (HTTPS)"
    echo "✅ Updated application configuration"
    echo
}

# Main script
main() {
    # Check if running on local machine (not on server)
    if [ "$(hostname)" = "musebar-production" ] || [ -f "/var/www/MOSEHXL" ]; then
        print_error "This script should be run on your local machine, not on the server"
        exit 1
    fi
    
    # Check for required tools
    if ! command_exists ssh-keygen; then
        print_error "ssh-keygen not found. Please install OpenSSH"
        exit 1
    fi
    
    if ! command_exists ssh; then
        print_error "ssh not found. Please install OpenSSH"
        exit 1
    fi
    
    if ! command_exists curl; then
        print_error "curl not found. Please install curl"
        exit 1
    fi
    
    # Main loop
    while true; do
        show_menu
        read -p "Choose an option (1-9): " choice
        
        case $choice in
            1)
                generate_ssh_key
                ;;
            2)
                add_ssh_key_to_digitalocean
                ;;
            3)
                configure_ssh_authentication
                ;;
            4)
                setup_domain
                ;;
            5)
                configure_ssl
                ;;
            6)
                update_application_for_domain
                ;;
            7)
                test_domain_configuration
                ;;
            8)
                complete_setup
                ;;
            9)
                print_status "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please choose 1-9."
                ;;
        esac
        
        echo
        read -p "Press Enter to continue..."
    done
}

# Run main function
main "$@" 