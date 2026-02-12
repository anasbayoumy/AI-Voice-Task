# GITHUB WORKFLOWS DEPLOYMENT GUIDE

## Overview
Two automated workflows have been configured:
1. **Server**: Builds Docker image and pushes to GitHub Container Registry
2. **Client**: Builds static files and deploys to `client` branch

---

## Workflow 1: Server Docker Registry

### What It Does
- Triggers on push to `main` branch when `server/**` files change
- Builds Docker image from `server/Dockerfile`
- Pushes image to GitHub Container Registry (ghcr.io)
- Tags: `latest`, `main-<sha>`, `main`

### GitHub Setup Required

#### 1. Enable GitHub Packages
No setup needed - automatically available for your repository.

#### 2. Make Package Public (Optional)
After first push:
1. Go to: `https://github.com/users/YOUR_USERNAME/packages/container/REPO_NAME%2Fserver/settings`
2. Scroll to "Danger Zone"
3. Change visibility to "Public" (if you want public access)

#### 3. Repository Settings
Already configured in workflow - uses `GITHUB_TOKEN` automatically.

---

## Workflow 2: Client Static Deployment

### What It Does
- Triggers on push to `main` branch when `client/**` files change
- Installs dependencies and builds client
- Pushes `dist/` contents to `client` branch
- Creates orphan branch (clean history)

### GitHub Setup Required

#### 1. Enable GitHub Actions
Repository → Settings → Actions → General → Allow all actions

#### 2. Workflow Permissions
Repository → Settings → Actions → General → Workflow permissions:
- ✅ Select "Read and write permissions"
- ✅ Check "Allow GitHub Actions to create and approve pull requests"

#### 3. Branch Protection (Optional)
Don't protect the `client` branch - let Actions push to it.

---

## VPS Deployment Guide

### Prerequisites on VPS
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### Step 1: Authenticate with GitHub Registry

```bash
# Create GitHub Personal Access Token (PAT)
# Go to: https://github.com/settings/tokens/new
# Scopes needed: read:packages

# Save token and login
export GITHUB_TOKEN="your_token_here"
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### Step 2: Clone Repository Config

```bash
# On your VPS
mkdir -p ~/ai-voice-task
cd ~/ai-voice-task

# Download production compose file
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/docker-compose.prod.yml

# Or clone just the file
git clone --depth 1 --filter=blob:none --sparse https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
git sparse-checkout set docker-compose.prod.yml
```

### Step 3: Create Environment File

```bash
# Create .env file
cat > .env << 'EOF'
# GitHub Repository (for image path)
GITHUB_REPOSITORY=your-username/your-repo-name

# OpenAI
OPENAI_API_KEY=sk-...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Server Config
SERVER_PUBLIC_URL=https://yourdomain.com
PORT=8080

# Optional
API_KEY=your-secret-key
TEST_MODE=false
STATUS_CALLBACK_STRICT=true
EOF

# Secure the file
chmod 600 .env
```

### Step 4: Deploy

```bash
# Pull latest image
docker compose -f docker-compose.prod.yml pull

# Start server
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Check health
curl http://localhost:8080/health
```

### Step 5: Update Server (When New Version Available)

```bash
# Pull latest
docker compose -f docker-compose.prod.yml pull

# Recreate with new image
docker compose -f docker-compose.prod.yml up -d

# Old container stops automatically, new one starts
```

---

## Alternative: Deploy Script

Create `deploy.sh` on VPS:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying AI Voice Agent..."

# Navigate to directory
cd ~/ai-voice-task

# Pull latest image
echo "📥 Pulling latest image..."
docker compose -f docker-compose.prod.yml pull

# Restart services
echo "🔄 Restarting services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for health check
echo "⏳ Waiting for server to start..."
sleep 5

# Check health
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
    docker compose -f docker-compose.prod.yml logs --tail=20
else
    echo "❌ Health check failed!"
    docker compose -f docker-compose.prod.yml logs --tail=50
    exit 1
fi
```

Make executable and use:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Nginx Reverse Proxy (Recommended)

### Install Nginx
```bash
sudo apt-get install nginx certbot python3-certbot-nginx
```

### Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/ai-voice-agent
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/ai-voice-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

---

## Client Branch Usage

### Access Built Files
After workflow runs, client build is available at:
```
https://github.com/YOUR_USERNAME/YOUR_REPO/tree/client
```

### Serve with GitHub Pages
1. Repository → Settings → Pages
2. Source: Deploy from a branch
3. Branch: `client` / `/ (root)`
4. Save

Your client will be available at:
```
https://YOUR_USERNAME.github.io/YOUR_REPO/
```

### Or Download Build
```bash
# Download latest build
git clone -b client --single-branch https://github.com/YOUR_USERNAME/YOUR_REPO.git client-build
cd client-build
# dist files are here
```

---

## Monitoring & Maintenance

### View Logs
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Restart Server
```bash
docker compose -f docker-compose.prod.yml restart
```

### Stop Server
```bash
docker compose -f docker-compose.prod.yml down
```

### Update Environment Variables
```bash
nano .env
docker compose -f docker-compose.prod.yml up -d
```

### Check Resource Usage
```bash
docker stats
```

---

## Troubleshooting

### Issue: Image Pull Failed
```bash
# Re-login to registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

### Issue: Permission Denied
```bash
# Make package public or use correct token with read:packages scope
```

### Issue: Container Won't Start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check environment
docker compose -f docker-compose.prod.yml config
```

### Issue: Port Already in Use
```bash
# Find what's using port 8080
sudo lsof -i :8080

# Kill process or change PORT in .env
```

---

## Workflow Status Badges

Add to your README.md:

```markdown
![Server Build](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/build-registry.yml/badge.svg)
![Client Build](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/build-client.yml/badge.svg)
```

---

## Security Best Practices

1. ✅ Use secrets for sensitive data (already configured)
2. ✅ Don't commit `.env` files (in .gitignore)
3. ✅ Use read-only GitHub tokens when possible
4. ✅ Enable automatic security updates
5. ✅ Regularly update base images
6. ✅ Use HTTPS (Nginx + Let's Encrypt)
7. ✅ Set up firewall (ufw)

```bash
# Basic firewall setup
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

---

## Summary

### What You Get

✅ **Automated Server Builds**
- Push to main → Docker image built
- Available at: `ghcr.io/username/repo/server:latest`

✅ **Automated Client Builds**
- Push to main → Client built and deployed
- Available at: `client` branch

✅ **Easy VPS Deployment**
- Pull image from registry
- Run with docker-compose
- Update with single command

✅ **Production Ready**
- Proper logging
- Restart policies
- Resource limits (can be added)

---

**Next Steps:**
1. Push code to GitHub to trigger workflows
2. Check Actions tab for build status
3. Follow VPS deployment guide above
4. Set up domain and SSL with Nginx
