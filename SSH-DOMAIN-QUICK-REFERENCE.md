# 🔐 SSH & Domain Setup - Quick Reference

**Quick commands and steps for setting up SSH keys and domain for MuseBar POS**

---

## 🚀 **Quick Start**

```bash
# Run automated setup
./scripts/setup-ssh-and-domain.sh
```

---

## 📋 **SSH Key Setup**

### **Generate SSH Key**
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N "" -C "musebar-production"
cat ~/.ssh/id_rsa.pub
```

### **Add to DigitalOcean**
1. Go to: https://cloud.digitalocean.com/account/security/ssh
2. Click "Add SSH Key"
3. Name: `MuseBar Production`
4. Paste public key from `cat ~/.ssh/id_rsa.pub`

### **Test Connection**
```bash
ssh root@YOUR_SERVER_IP
```

---

## 🌐 **Domain Setup**

### **DNS Records to Add**
| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 5 min |
| A | www | YOUR_SERVER_IP | 5 min |

### **Configure SSL on Server**
```bash
# SSH to server
ssh root@YOUR_SERVER_IP

# Update Nginx
sed -i "s/server_name _;/server_name yourdomain.com www.yourdomain.com;/" /etc/nginx/sites-available/musebar
nginx -t && systemctl reload nginx

# Install SSL
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com --non-interactive --agree-tos --email admin@yourdomain.com
```

### **Update Application**
```bash
# Update backend
cd /var/www/MOSEHXL/MuseBar/backend
sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://yourdomain.com|" .env

# Update frontend
cd /var/www/MOSEHXL/MuseBar
echo "REACT_APP_API_URL=https://yourdomain.com/api" > .env.production
npm run build

# Restart services
pm2 restart all
```

---

## 🔧 **Troubleshooting**

### **SSH Issues**
```bash
# Fix permissions
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# Test with verbose
ssh -v root@YOUR_SERVER_IP
```

### **Domain Issues**
```bash
# Check DNS propagation
nslookup yourdomain.com

# Test SSL
curl -I https://yourdomain.com
```

### **Application Issues**
```bash
# Check PM2 status
pm2 status

# Restart all
pm2 restart all

# Check logs
pm2 logs
```

---

## ✅ **Verification**

### **SSH**
- [ ] `ssh root@YOUR_SERVER_IP` works without password
- [ ] Key listed in DigitalOcean dashboard

### **Domain**
- [ ] `https://yourdomain.com` loads with green lock
- [ ] No SSL warnings
- [ ] MuseBar POS login page appears

---

## 📞 **Need Help?**

- **Full Guide:** `SSH-AND-DOMAIN-SETUP.md`
- **Automated Script:** `./scripts/setup-ssh-and-domain.sh`
- **DigitalOcean SSH:** https://cloud.digitalocean.com/account/security/ssh
- **DNS Checker:** https://www.whatsmydns.net/

---

*Replace `YOUR_SERVER_IP` and `yourdomain.com` with your actual values.* 