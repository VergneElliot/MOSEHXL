# 🚀 MuseBar Deployment Guide

This guide provides comprehensive instructions for deploying the MuseBar Point of Sale system to various environments.

## 📋 **Prerequisites**

### **System Requirements**
- **Node.js**: v18+ (LTS recommended)
- **PostgreSQL**: v13+ 
- **Memory**: Minimum 2GB RAM, 4GB+ recommended
- **Storage**: 10GB+ available space
- **Network**: Stable internet connection for updates

### **Software Dependencies**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm postgresql postgresql-contrib nginx

# CentOS/RHEL
sudo yum install -y nodejs npm postgresql postgresql-server nginx

# macOS
brew install node postgresql nginx
```

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   PostgreSQL    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   Database      │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Nginx Proxy   │
                    │   Port: 80/443  │
                    └─────────────────┘
```

## 🐳 **Docker Deployment (Recommended)**

### **1. Create Docker Compose Configuration**

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:13
    container_name: musebar-db
    environment:
      POSTGRES_DB: mosehxl_production
      POSTGRES_USER: musebar
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-database.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - musebar-network

  # Backend API
  backend:
    build:
      context: ./MuseBar/backend
      dockerfile: Dockerfile
    container_name: musebar-backend
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: mosehxl_production
      DB_USER: musebar
      DB_PASSWORD: ${DB_PASSWORD}
      PORT: 3001
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3001:3001"
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - musebar-network

  # Frontend Application
  frontend:
    build:
      context: ./MuseBar
      dockerfile: Dockerfile
    container_name: musebar-frontend
    environment:
      REACT_APP_API_URL: http://localhost:3001/api
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - musebar-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: musebar-nginx
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - musebar-network

volumes:
  postgres_data:

networks:
  musebar-network:
    driver: bridge
```

### **2. Create Backend Dockerfile**

```dockerfile
# MuseBar/backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S musebar -u 1001

# Change ownership
RUN chown -R musebar:nodejs /app
USER musebar

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["npm", "start"]
```

### **3. Create Frontend Dockerfile**

```dockerfile
# MuseBar/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### **4. Create Nginx Configuration**

```nginx
# nginx.conf
upstream backend {
    server backend:3001;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name localhost;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name localhost;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }

    # API Documentation
    location /api/docs/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### **5. Environment Variables**

```bash
# .env
DB_PASSWORD=your_secure_database_password
JWT_SECRET=your_very_long_jwt_secret_key
NODE_ENV=production
```

### **6. Deploy with Docker Compose**

```bash
# Clone the repository
git clone https://github.com/your-username/musebar.git
cd musebar

# Create environment file
cp .env.example .env
# Edit .env with your values

# Build and start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## ☁️ **Cloud Deployment**

### **AWS Deployment**

#### **1. EC2 Instance Setup**

```bash
# Launch EC2 instance (Ubuntu 20.04 LTS)
# t3.medium or larger recommended

# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone https://github.com/your-username/musebar.git
cd musebar

# Deploy
docker-compose up -d
```

#### **2. RDS Database Setup**

```sql
-- Create database
CREATE DATABASE mosehxl_production;

-- Create user
CREATE USER musebar WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE mosehxl_production TO musebar;
```

#### **3. Load Balancer Configuration**

```bash
# Create Application Load Balancer
# Target Group: backend:3001
# Health Check: /api/health
# SSL Certificate: ACM certificate
```

### **Google Cloud Platform**

#### **1. GKE Deployment**

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: musebar-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: musebar-backend
  template:
    metadata:
      labels:
        app: musebar-backend
    spec:
      containers:
      - name: backend
        image: gcr.io/your-project/musebar-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: DB_HOST
          value: "your-cloud-sql-instance"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
---
apiVersion: v1
kind: Service
metadata:
  name: musebar-backend-service
spec:
  selector:
    app: musebar-backend
  ports:
  - port: 80
    targetPort: 3001
  type: LoadBalancer
```

### **Azure Deployment**

#### **1. Container Instances**

```bash
# Deploy to Azure Container Instances
az container create \
  --resource-group your-rg \
  --name musebar-backend \
  --image your-registry.azurecr.io/musebar-backend:latest \
  --dns-name-label musebar-backend \
  --ports 3001 \
  --environment-variables \
    DB_HOST=your-azure-sql-server \
    DB_PASSWORD=your-password
```

## 🔧 **Manual Deployment**

### **1. Server Setup**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx
sudo apt install nginx -y

# Install PM2 for process management
sudo npm install -g pm2
```

### **2. Database Setup**

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE mosehxl_production;
CREATE USER musebar WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE mosehxl_production TO musebar;
\q

# Run migrations
cd MuseBar/backend
npm run migration:migrate
```

### **3. Backend Deployment**

```bash
# Clone repository
git clone https://github.com/your-username/musebar.git
cd musebar/MuseBar/backend

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'musebar-backend',
    script: 'dist/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_NAME: 'mosehxl_production',
      DB_USER: 'musebar',
      DB_PASSWORD: 'your_secure_password'
    }
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### **4. Frontend Deployment**

```bash
# Build frontend
cd ../MuseBar
npm ci
npm run build

# Copy to nginx
sudo cp -r build/* /var/www/html/

# Configure nginx
sudo nano /etc/nginx/sites-available/musebar

# Create nginx configuration
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/musebar /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 **Security Configuration**

### **1. SSL Certificate (Let's Encrypt)**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **2. Firewall Configuration**

```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### **3. Database Security**

```sql
-- Restrict database access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE mosehxl_production TO musebar;
GRANT USAGE ON SCHEMA public TO musebar;
GRANT ALL ON ALL TABLES IN SCHEMA public TO musebar;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO musebar;
```

## 📊 **Monitoring & Maintenance**

### **1. Health Checks**

```bash
# Backend health
curl http://localhost:3001/api/health

# Database connection
psql -h localhost -U musebar -d mosehxl_production -c "SELECT 1;"

# Frontend availability
curl -I http://localhost
```

### **2. Log Monitoring**

```bash
# PM2 logs
pm2 logs musebar-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### **3. Backup Strategy**

```bash
# Database backup script
#!/bin/bash
BACKUP_DIR="/backups/musebar"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/musebar_$DATE.sql"

mkdir -p $BACKUP_DIR
pg_dump -h localhost -U musebar mosehxl_production > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### **4. Performance Monitoring**

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Monitor system resources
htop
iotop
nethogs
```

## 🚀 **Deployment Checklist**

### **Pre-Deployment**
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Database migrations ready
- [ ] SSL certificates obtained
- [ ] Backup strategy in place

### **Deployment**
- [ ] Environment variables configured
- [ ] Database initialized
- [ ] Backend deployed and running
- [ ] Frontend built and deployed
- [ ] Nginx configured
- [ ] SSL certificates installed

### **Post-Deployment**
- [ ] Health checks passing
- [ ] Performance monitoring active
- [ ] Logs being collected
- [ ] Backup system working
- [ ] Security scanning completed
- [ ] Documentation updated

## 🆘 **Troubleshooting**

### **Common Issues**

#### **1. Database Connection Errors**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U musebar -d mosehxl_production

# Check logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### **2. Backend Not Starting**
```bash
# Check PM2 status
pm2 status
pm2 logs musebar-backend

# Check port availability
sudo netstat -tlnp | grep :3001

# Check environment variables
pm2 env musebar-backend
```

#### **3. Frontend Not Loading**
```bash
# Check nginx status
sudo systemctl status nginx

# Check nginx configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log
```

### **Emergency Procedures**

#### **1. Rollback Deployment**
```bash
# Stop current deployment
pm2 stop musebar-backend

# Restore from backup
pg_restore -h localhost -U musebar -d mosehxl_production backup_file.sql

# Restart with previous version
pm2 start ecosystem.config.js
```

#### **2. Emergency Maintenance Mode**
```bash
# Enable maintenance mode
echo "System under maintenance" > /var/www/html/maintenance.html

# Redirect all traffic to maintenance page
sudo nano /etc/nginx/sites-available/musebar
# Add maintenance page configuration
```

## 📞 **Support**

For deployment support:
- **Email**: support@musebar.com
- **Documentation**: https://docs.musebar.com
- **GitHub Issues**: https://github.com/your-username/musebar/issues

---

**🎉 Congratulations! Your MuseBar system is now professionally deployed and ready for production use!** 