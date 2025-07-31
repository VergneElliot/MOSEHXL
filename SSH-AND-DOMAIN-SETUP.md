# 🔐 SSH Key & Domain Setup Guide for MuseBar POS

**Complete guide to set up SSH key authentication and configure a domain name for your DigitalOcean deployment**

---

## 📋 **What We'll Accomplish**

By the end of this guide, you'll have:
- ✅ **SSH Key Authentication** - Secure, passwordless access to your server
- ✅ **Custom Domain Name** - Professional URL instead of IP address
- ✅ **SSL Certificate** - HTTPS with green lock icon
- ✅ **Updated Application** - Configured to work with your domain

**Total Time:** 30-45 minutes  
**Cost:** ~$12/year for domain name (optional)

---

## 🚀 **Quick Start (Automated)**

If you want to run the automated setup script:

```bash
# Run the setup script
./scripts/setup-ssh-and-domain.sh
```

The script will guide you through all steps interactively.

---

## 📝 **Manual Step-by-Step Guide**

### **Step 1: Generate SSH Key Pair**

**Why SSH Keys?**
- More secure than passwords
- No need to remember/type passwords
- Required for automated deployments
- Industry standard for server access

**Generate your SSH key:**

```bash
# Generate SSH key pair (no passphrase for simplicity)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N "" -C "musebar-production"

# View your public key
cat ~/.ssh/id_rsa.pub
```

**Expected output:**
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC... musebar-production
```

---

### **Step 2: Add SSH Key to DigitalOcean**

1. **Go to DigitalOcean Dashboard:**
   - Visit: https://cloud.digitalocean.com/account/security/ssh
   - Or: Dashboard → Settings → Security → SSH Keys

2. **Add SSH Key:**
   - Click "Add SSH Key"
   - **Name:** `MuseBar Production`
   - **Public Key:** Copy the entire output from `cat ~/.ssh/id_rsa.pub`
   - Click "Add SSH Key"

3. **Verify:**
   - You should see your key listed in the SSH Keys section
   - Note the fingerprint (for verification)

---

### **Step 3: Test SSH Key Authentication**

**Test connection to your server:**

```bash
# Replace YOUR_SERVER_IP with your actual IP
ssh root@YOUR_SERVER_IP

# If successful, you should see:
# root@musebar-production:~#
```

**If it asks for a password:**
- The SSH key isn't properly configured yet
- You can still use password authentication temporarily
- Make sure the key is added to DigitalOcean correctly

---

### **Step 4: Register a Domain Name**

**Domain Options:**
- **Namecheap:** ~$12/year, good interface
- **GoDaddy:** ~$12/year, popular
- **Google Domains:** ~$12/year, simple
- **Cloudflare:** ~$8/year, excellent DNS

**Registration Process:**
1. **Choose a domain name:** `yourbarname.com`
2. **Register for 1 year** (you can renew later)
3. **Complete registration** with your details

**Domain Name Ideas:**
- `musebar.com`
- `yourbarname.com`
- `pos.yourbarname.com`
- `barpos.com`

---

### **Step 5: Configure DNS Records**

**Point your domain to your server:**

1. **Go to your domain registrar's DNS settings**
2. **Add these A records:**

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 5 min |
| A | www | YOUR_SERVER_IP | 5 min |

**Example (if your server IP is 134.122.89.45):**
- **A Record 1:** `@` → `134.122.89.45`
- **A Record 2:** `www` → `134.122.89.45`

**Wait 15-30 minutes** for DNS propagation.

---

### **Step 6: Configure SSL Certificate**

**Connect to your server and set up SSL:**

```bash
# SSH to your server
ssh root@YOUR_SERVER_IP

# Update Nginx configuration with your domain
sed -i "s/server_name _;/server_name yourdomain.com www.yourdomain.com;/" /etc/nginx/sites-available/musebar

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Install Certbot (if not already installed)
apt update
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com --non-interactive --agree-tos --email admin@yourdomain.com

# Test SSL
curl -I https://yourdomain.com
```

**Expected output:**
```
HTTP/2 200
server: nginx/1.18.0
...
```

---

### **Step 7: Update Application Configuration**

**Update your MuseBar POS for the new domain:**

```bash
# SSH to your server
ssh root@YOUR_SERVER_IP

# Update backend CORS origin
cd /var/www/MOSEHXL/MuseBar/backend
sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://yourdomain.com|" .env

# Update frontend API URL
cd /var/www/MOSEHXL/MuseBar
echo "REACT_APP_API_URL=https://yourdomain.com/api" > .env.production

# Rebuild frontend
npm run build

# Restart backend
cd /var/www/MOSEHXL/MuseBar/backend
pm2 restart musebar-backend

# Restart frontend
cd /var/www/MOSEHXL
pm2 restart musebar-frontend
```

---

### **Step 8: Test Your Domain**

**Test your new domain:**

```bash
# Test HTTP (should redirect to HTTPS)
curl -I http://yourdomain.com

# Test HTTPS
curl -I https://yourdomain.com

# Test in browser
# Visit: https://yourdomain.com
```

**You should see:**
- ✅ Green lock icon in browser
- ✅ MuseBar POS login page
- ✅ No security warnings

---

## 🔧 **Troubleshooting**

### **SSH Key Issues**

**Problem:** SSH asks for password
**Solution:**
```bash
# Check if key is added to DigitalOcean
# Try connecting with verbose output
ssh -v root@YOUR_SERVER_IP

# Check your public key
cat ~/.ssh/id_rsa.pub
```

**Problem:** Permission denied
**Solution:**
```bash
# Fix SSH key permissions
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

### **Domain Issues**

**Problem:** Domain not resolving
**Solution:**
- Wait 15-30 minutes for DNS propagation
- Check DNS records are correct
- Use `nslookup yourdomain.com` to test

**Problem:** SSL certificate fails
**Solution:**
```bash
# Check domain is pointing to correct IP
nslookup yourdomain.com

# Re-run certbot
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### **Application Issues**

**Problem:** Frontend not loading
**Solution:**
```bash
# Check PM2 status
pm2 status

# Restart services
pm2 restart all

# Check logs
pm2 logs
```

---

## 📊 **Verification Checklist**

After setup, verify these items:

### **SSH Authentication**
- [ ] `ssh root@YOUR_SERVER_IP` works without password
- [ ] SSH key is listed in DigitalOcean dashboard
- [ ] Can access server files and run commands

### **Domain Configuration**
- [ ] Domain resolves to your server IP
- [ ] `http://yourdomain.com` redirects to `https://yourdomain.com`
- [ ] Green lock icon in browser
- [ ] No SSL certificate warnings

### **Application**
- [ ] MuseBar POS loads at `https://yourdomain.com`
- [ ] Login page appears
- [ ] Can log in and use the system
- [ ] API calls work (check browser dev tools)

---

## 🔄 **Maintenance**

### **SSL Certificate Renewal**
SSL certificates auto-renew, but you can check:
```bash
# Check certificate expiration
certbot certificates

# Test renewal
certbot renew --dry-run
```

### **Domain Renewal**
- Set calendar reminder for domain renewal
- Most registrars send email reminders
- Consider auto-renewal for convenience

### **SSH Key Rotation**
For security, rotate SSH keys annually:
```bash
# Generate new key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_new

# Add to DigitalOcean
# Test connection
# Remove old key from DigitalOcean
```

---

## 🎉 **Congratulations!**

Your MuseBar POS is now professionally configured with:
- ✅ **Secure SSH access** (no passwords needed)
- ✅ **Custom domain name** (professional URL)
- ✅ **SSL certificate** (HTTPS with green lock)
- ✅ **Updated application** (configured for your domain)

**Your POS system is ready for production use!**

**Access your system at:** `https://yourdomain.com`

---

## 📞 **Need Help?**

If you encounter issues:

1. **Check the troubleshooting section above**
2. **Run the automated script:** `./scripts/setup-ssh-and-domain.sh`
3. **Review logs:** `pm2 logs` on the server
4. **Check DigitalOcean status:** https://status.digitalocean.com

**Common Issues:**
- DNS propagation takes time (15-30 minutes)
- SSL certificates need domain to be properly configured first
- SSH keys must be added to DigitalOcean before testing

---

## 🔗 **Useful Links**

- **DigitalOcean SSH Keys:** https://cloud.digitalocean.com/account/security/ssh
- **Let's Encrypt (SSL):** https://letsencrypt.org/
- **DNS Propagation Checker:** https://www.whatsmydns.net/
- **SSL Certificate Checker:** https://www.ssllabs.com/ssltest/

---

*This guide ensures your MuseBar POS deployment follows industry best practices for security and professionalism.* 