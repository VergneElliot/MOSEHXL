#!/bin/bash

# MuseBar POS - DigitalOcean Deployment Script
# This script sets up the complete production environment

set -e  # Exit on any error

echo "🚀 MuseBar POS - DigitalOcean Deployment Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

print_status "Starting MuseBar POS deployment..."

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
print_success "Node.js installed: $node_version"
print_success "npm installed: $npm_version"

# Install required packages
print_status "Installing required packages..."
sudo apt install -y nginx postgresql-client git ufw fail2ban

# Install PM2 globally
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Configure firewall
print_status "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Create application directory
print_status "Setting up application directory..."
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www

# Clone repository (you'll need to update the URL)
print_status "Cloning repository..."
cd /var/www
if [ ! -d "MOSEHXL" ]; then
    print_warning "Please provide your GitHub repository URL:"
    read -p "Repository URL: " REPO_URL
    git clone $REPO_URL
else
    print_success "Repository already exists, pulling latest changes..."
    cd MOSEHXL
    git pull
    cd ..
fi

# Setup backend
print_status "Setting up backend..."
cd /var/www/MOSEHXL/MuseBar/backend

# Install backend dependencies
npm ci --only=production

# Build backend
npm run build

# Create environment file
print_status "Creating environment configuration..."
cat > .env << EOL
NODE_ENV=production
PORT=3001
# Database configuration (to be filled later)
DB_HOST=
DB_PORT=5432
DB_NAME=mosehxl_production
DB_USER=
DB_PASSWORD=
# JWT secret (generate a secure one)
JWT_SECRET=$(openssl rand -base64 32)
# CORS origin (your domain)
CORS_ORIGIN=
EOL

print_warning "Environment file created. You'll need to fill in database details later."

# Setup frontend
print_status "Setting up frontend..."
cd /var/www/MOSEHXL/MuseBar

# Install frontend dependencies
npm ci --only=production

# Create production environment file
cat > .env.production << EOL
REACT_APP_API_URL=
EOL

print_warning "Frontend environment file created. You'll need to set your domain URL later."

# Build frontend
npm run build

# Configure Nginx
print_status "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/musebar << EOL
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root /var/www/MOSEHXL/MuseBar/build;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001/api/health;
    }
}
EOL

# Enable the site
sudo ln -sf /etc/nginx/sites-available/musebar /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Create startup script
print_status "Creating startup script..."
cat > /var/www/MOSEHXL/start-musebar.sh << EOL
#!/bin/bash
cd /var/www/MOSEHXL/MuseBar/backend
pm2 start dist/app.js --name "musebar-backend" || pm2 restart musebar-backend
pm2 save
EOL

chmod +x /var/www/MOSEHXL/start-musebar.sh

# Setup PM2 startup
pm2 startup
print_warning "PM2 startup configured. You may need to run the command shown above."

# Create backup script
print_status "Creating backup script..."
mkdir -p /home/$USER/backups
cat > /home/$USER/backup-musebar.sh << EOL
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
if [ ! -z "\$DB_HOST" ]; then
    pg_dump -h \$DB_HOST -U \$DB_USER mosehxl_production > /home/$USER/backups/musebar_backup_\$DATE.sql
    # Keep only last 7 days
    find /home/$USER/backups -name "musebar_backup_*.sql" -type f -mtime +7 -delete
    echo "Backup created: musebar_backup_\$DATE.sql"
else
    echo "Database not configured yet"
fi
EOL

chmod +x /home/$USER/backup-musebar.sh

print_success "Server setup completed!"
print_warning "Next steps:"
echo "1. Set up your database (DigitalOcean Managed PostgreSQL recommended)"
echo "2. Update the .env file with database credentials"
echo "3. Update your domain name in Nginx configuration"
echo "4. Install SSL certificate with: sudo certbot --nginx -d yourdomain.com"
echo "5. Start the application with: /var/www/MOSEHXL/start-musebar.sh"

print_status "Installation log saved to: /var/log/musebar-install.log" 