# 🚀 MOSEHXL Deployment Guide

Complete guide for deploying your MuseBar POS system to production with minimal cost and maximum reliability.

---

## 📋 **Quick Deployment Checklist**

- [ ] Choose hosting provider
- [ ] Set up domain name
- [ ] Configure production environment
- [ ] Set up database
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Set up SSL certificate
- [ ] Configure monitoring
- [ ] Test production deployment

---

## 💰 **Recommended Cheap Hosting Solutions**

### 🥇 **Best Option: DigitalOcean ($12/month)**

**Why DigitalOcean:**
- ✅ $12/month for 2GB RAM, 50GB SSD (perfect for your app)
- ✅ Easy Docker deployment
- ✅ Built-in monitoring
- ✅ Automatic backups available
- ✅ One-click PostgreSQL database
- ✅ Global CDN included

**Setup:**
```bash
# 1. Create DigitalOcean account (get $200 credit with referral)
# 2. Create Droplet: Ubuntu 22.04, 2GB RAM, $12/month
# 3. Add managed PostgreSQL database ($15/month)
# Total: ~$27/month for complete setup
```

### 🥈 **Budget Alternative: Railway ($5-15/month)**

**Why Railway:**
- ✅ $5/month starter plan
- ✅ Auto-scaling
- ✅ Git-based deployments
- ✅ Built-in database
- ✅ Zero-config deployments

### 🥉 **Free Tier: Render + Supabase (Free to start)**

**Why Render + Supabase:**
- ✅ Render: Free tier for web services
- ✅ Supabase: Free PostgreSQL database
- ✅ Automatic HTTPS
- ✅ No credit card required to start

---

## 🌐 **Domain Name Setup**

### **1. Domain Registration ($10-15/year)**

**Recommended Providers:**
- **Namecheap** - $10-12/year (.com domains)
- **Cloudflare Registrar** - At-cost pricing (~$9/year)
- **Google Domains** - $12/year

**Domain Suggestions:**
- `yourbarname-pos.com`
- `musebar-yourname.com`
- `yourbar-system.com`

### **2. DNS Configuration**

```bash
# Point your domain to your server
A record    @              YOUR_SERVER_IP
A record    www            YOUR_SERVER_IP
CNAME       api            @
```

---

## 🏗️ **Production Environment Setup**

### **1. Server Configuration**

```bash
# Connect to your server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install required software
apt install -y nodejs npm nginx postgresql-client git docker.io docker-compose

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2
```

### **2. Database Setup**

#### **Option A: Managed Database (Recommended)**
```bash
# Use DigitalOcean Managed PostgreSQL
# - Automatic backups
# - High availability
# - Monitoring included
# Connection string: postgresql://user:pass@host:port/dbname
```

#### **Option B: Self-hosted Database**
```bash
# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Create database
sudo -u postgres createdb mosehxl_production
sudo -u postgres createuser --interactive musebar_user
sudo -u postgres psql -c "ALTER USER musebar_user PASSWORD 'secure_password_here';"
```

---

## 🎯 **Branch Strategy & Git Workflow**

### **Branch Structure**
```
main (production)     ← Live website
└── development       ← New features, testing
    └── feature/xyz   ← Individual features
```

### **Setup Production Branch**
```bash
# Create and switch to main branch for production
git checkout -b main
git push -u origin main

# Keep development branch for new features
git checkout development

# Example workflow:
# 1. Develop on development branch
# 2. Test thoroughly
# 3. Merge to main when ready for production
# 4. Deploy main branch to live server
```

### **Deployment Workflow**
```bash
# Development → Production Process:

# 1. Work on development branch
git checkout development
# ... make changes ...
git add .
git commit -m "Add new feature"
git push origin development

# 2. When ready for production:
git checkout main
git merge development
git push origin main

# 3. Deploy to production (automatic with webhooks)
```

---

## 🚀 **Deployment Process**

### **1. Backend Deployment**

```bash
# Clone repository on server
cd /var/www
git clone https://github.com/yourusername/MOSEHXL.git
cd MOSEHXL/MuseBar/backend

# Install dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Create environment file
cat > .env << EOL
NODE_ENV=production
PORT=3001
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=mosehxl_production
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your_super_secure_jwt_secret_here
CORS_ORIGIN=https://yourdomainname.com
EOL

# Start with PM2
pm2 start dist/app.js --name "musebar-backend"
pm2 save
pm2 startup
```

### **2. Frontend Deployment**

```bash
# Build frontend
cd /var/www/MOSEHXL/MuseBar
npm ci --only=production
npm run build

# Configure environment
cat > .env.production << EOL
REACT_APP_API_URL=https://yourdomainname.com/api
EOL

# Rebuild with production config
npm run build
```

### **3. Nginx Configuration**

```bash
# Create Nginx config
cat > /etc/nginx/sites-available/musebar << EOL
server {
    listen 80;
    server_name yourdomainname.com www.yourdomainname.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomainname.com www.yourdomainname.com;

    ssl_certificate /etc/letsencrypt/live/yourdomainname.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomainname.com/privkey.pem;

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
}
EOL

# Enable site
ln -s /etc/nginx/sites-available/musebar /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### **4. SSL Certificate (Let's Encrypt - Free)**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomainname.com -d www.yourdomainname.com

# Auto-renewal is set up automatically
```

---

## 🔄 **Automated Deployment with GitHub Actions**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.KEY }}
        script: |
          cd /var/www/MOSEHXL
          git pull origin main
          cd MuseBar/backend
          npm ci --only=production
          npm run build
          pm2 restart musebar-backend
          cd ../
          npm ci --only=production
          npm run build
          systemctl reload nginx
```

---

## 📊 **Monitoring & Maintenance**

### **1. Server Monitoring**

```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-server-monit

# Check application status
pm2 status
pm2 logs musebar-backend
pm2 monit
```

### **2. Database Backups**

```bash
# Create backup script
cat > /home/backup-db.sh << EOL
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
pg_dump -h YOUR_DB_HOST -U YOUR_DB_USER mosehxl_production > /backups/musebar_backup_\$DATE.sql
# Keep only last 7 days
find /backups -name "musebar_backup_*.sql" -type f -mtime +7 -delete
EOL

chmod +x /home/backup-db.sh

# Schedule daily backups
echo "0 2 * * * /home/backup-db.sh" | crontab -
```

---

## 💸 **Cost Breakdown**

### **Recommended Setup (DigitalOcean)**
- **Server**: $12/month (2GB RAM Droplet)
- **Database**: $15/month (Managed PostgreSQL)
- **Domain**: $10/year ($0.83/month)
- **Total**: ~$28/month

### **Budget Setup (Railway)**
- **Hosting**: $5/month (includes database)
- **Domain**: $10/year ($0.83/month)
- **Total**: ~$6/month

### **Free Tier Setup**
- **Render**: Free (with limitations)
- **Supabase**: Free (1GB database)
- **Domain**: $10/year ($0.83/month)
- **Total**: ~$1/month

---

## 🚀 **Quick Start Commands**

### **Deploy to DigitalOcean (Recommended)**

```bash
# 1. Create account and droplet
doctl auth init
doctl compute droplet create musebar-prod --size s-2vcpu-2gb --image ubuntu-22-04-x64 --region nyc1

# 2. Run setup script
curl -sSL https://raw.githubusercontent.com/yourusername/MOSEHXL/main/scripts/deploy-production.sh | bash

# 3. Point domain to droplet IP
# 4. Run SSL setup
certbot --nginx -d yourdomainname.com
```

### **Deploy to Railway**

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and deploy
railway login
railway init
railway up
```

---

## 🔒 **Security Checklist**

- [ ] SSL certificate installed
- [ ] Strong database passwords
- [ ] JWT secret is secure
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] Regular security updates scheduled
- [ ] Database backups automated
- [ ] Server monitoring active

---

## 🛠️ **Troubleshooting**

### **Common Issues**

**1. Backend not starting:**
```bash
pm2 logs musebar-backend
# Check database connection
# Verify environment variables
```

**2. Frontend not loading:**
```bash
nginx -t
systemctl status nginx
# Check build files exist
ls -la /var/www/MOSEHXL/MuseBar/build
```

**3. Database connection issues:**
```bash
# Test connection
psql -h YOUR_DB_HOST -U YOUR_DB_USER -d mosehxl_production -c "\dt"
```

---

## 📞 **Support & Next Steps**

1. **Choose your hosting provider** based on budget
2. **Register your domain name**
3. **Follow the deployment steps** for your chosen platform
4. **Set up monitoring and backups**
5. **Test your production deployment**

🎉 **Your MuseBar POS system will be live and accessible 24/7!**

---

*For additional support or custom deployment assistance, refer to the troubleshooting section or check the GitHub repository.* 