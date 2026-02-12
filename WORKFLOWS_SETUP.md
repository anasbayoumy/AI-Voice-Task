# GITHUB WORKFLOWS SETUP COMPLETE ✅

## What Was Created

### ✅ Workflow 1: Server Docker Registry
**File**: `.github/workflows/build-registry.yml`

**Purpose**: Automatically build and push server Docker image to GitHub Container Registry

**Triggers**:
- Push to `main` branch when `server/**` changes
- Manual trigger via workflow_dispatch

**What It Does**:
1. Checks out code
2. Logs into GitHub Container Registry (ghcr.io)
3. Builds Docker image from `server/Dockerfile`
4. Pushes to: `ghcr.io/your-username/your-repo/server:latest`
5. Also tags with: `main-<sha>` for specific versions

**No Setup Needed**: Uses automatic `GITHUB_TOKEN` - works out of the box!

---

### ✅ Workflow 2: Client Static Deployment
**File**: `.github/workflows/build-client.yml`

**Purpose**: Build client and deploy to `client` branch for easy hosting

**Triggers**:
- Push to `main` branch when `client/**` changes
- Manual trigger via workflow_dispatch

**What It Does**:
1. Checks out code
2. Installs Node.js 20 with npm cache
3. Runs `npm ci` and `npm run build`
4. Pushes `dist/` contents to `client` branch (orphan, clean history)

**Setup Required**: 
Repository → Settings → Actions → General → Workflow permissions:
- ✅ Select "Read and write permissions"

---

### ✅ Production Docker Compose
**File**: `docker-compose.prod.yml`

**Purpose**: Simple VPS deployment configuration

**Features**:
- Pulls image from GitHub Container Registry
- Environment variables from `.env` file
- Auto-restart on failure
- Log rotation (10MB max, 3 files)

**Usage**:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Documentation Created

### 📚 DEPLOYMENT_GUIDE.md (Comprehensive)
**350+ lines** covering:
- GitHub Actions setup (both workflows)
- GitHub Container Registry authentication
- Complete VPS deployment steps
- Nginx reverse proxy setup
- SSL with Let's Encrypt
- GitHub Pages setup for client
- Monitoring and maintenance
- Troubleshooting guide
- Security best practices

### ⚡ VPS_QUICK_START.md (Quick Reference)
**40 lines** of copy-paste commands:
- One-time setup (5 steps)
- Deploy/update commands
- Daily operations (logs, restart, stop)

### 🔧 .env.production.example
Template for VPS environment configuration with all required variables.

---

## How It Works

### Automated Flow

```
Developer
    ↓
Push to main branch
    ↓
GitHub Actions (Automatic)
    ├─ Server Workflow
    │   ├─ Build Docker image
    │   └─ Push to ghcr.io/username/repo/server:latest
    │
    └─ Client Workflow
        ├─ Build React app
        └─ Push dist/ to client branch
    ↓
VPS Admin
    ↓
Pull latest image
    ↓
docker compose up -d
    ↓
Production Running! ✅
```

---

## VPS Deployment Steps (Summary)

### 1. First Time Setup (5 Commands)
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Create project directory
mkdir -p ~/ai-voice-task && cd ~/ai-voice-task

# Login to GitHub Registry (need token from github.com/settings/tokens)
echo YOUR_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Download docker-compose.prod.yml
curl -o docker-compose.prod.yml https://raw.githubusercontent.com/USERNAME/REPO/main/docker-compose.prod.yml

# Create .env (copy from .env.production.example)
nano .env  # Fill in your values
```

### 2. Deploy/Update (2 Commands)
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

That's it! Server automatically pulls latest image and restarts.

---

## Client Branch Usage

### Option 1: GitHub Pages
1. Repository → Settings → Pages
2. Source: Deploy from a branch
3. Branch: `client` / `/ (root)`
4. Your client available at: `https://username.github.io/repo-name/`

### Option 2: Download and Self-Host
```bash
git clone -b client --single-branch https://github.com/username/repo.git client-build
# Serve client-build/ with Nginx, Apache, etc.
```

### Option 3: CDN (Cloudflare Pages, Netlify)
Connect your repo's `client` branch to any static hosting platform.

---

## What You Need to Do Now

### 1. Enable GitHub Actions (If Not Already)
Repository → Settings → Actions → General:
- ✅ Allow all actions and reusable workflows

### 2. Set Workflow Permissions
Repository → Settings → Actions → General → Workflow permissions:
- ✅ Read and write permissions
- ✅ Allow GitHub Actions to create and approve pull requests

### 3. Test the Workflows

**Option A: Push to Main**
```bash
# Make any change to server or client
git add .
git commit -m "test: trigger workflows"
git push origin main

# Check: Repository → Actions tab
```

**Option B: Manual Trigger**
1. Repository → Actions
2. Select workflow (Build and Push Server / Build Client)
3. Click "Run workflow" → "Run workflow"

### 4. Verify Builds

**Server Image:**
- Repository → Packages
- Should see: `server` package
- Click to view versions and pull commands

**Client Branch:**
- Repository → Branches
- Should see: `client` branch
- Click to view built files

---

## Package Access

### Make Server Package Public (Optional)
After first workflow run:
1. Go to repository packages
2. Click on `server` package
3. Package settings → Change visibility → Public

Or keep private and authenticate on VPS (already covered in guide).

---

## Testing Locally Before VPS

### Test Server Image
```bash
# Pull the image
docker pull ghcr.io/username/repo/server:latest

# Run it
docker run -p 8080:8080 --env-file .env ghcr.io/username/repo/server:latest

# Test
curl http://localhost:8080/health
```

### Test Client Build
```bash
# Clone client branch
git clone -b client https://github.com/username/repo.git test-client
cd test-client

# Serve with any static server
npx serve .
# Or: python -m http.server 8000
```

---

## Monitoring Workflow Runs

### View Build Status
Repository → Actions → Click on workflow run

### Add Status Badges to README
```markdown
![Server Build](https://github.com/username/repo/actions/workflows/build-registry.yml/badge.svg)
![Client Build](https://github.com/username/repo/actions/workflows/build-client.yml/badge.svg)
```

---

## Cost Considerations

### GitHub
- ✅ Actions: 2,000 free minutes/month (public repos: unlimited)
- ✅ Container Registry: 500MB free storage
- ✅ Bandwidth: 1GB free/month

**Typical Usage**:
- Server build: ~3 minutes per build
- Client build: ~2 minutes per build
- Image size: ~150MB
- Well within free tier for most projects

### VPS Requirements
**Minimum**:
- 1 CPU core
- 1GB RAM
- 10GB storage
- Docker installed

**Recommended**:
- 2 CPU cores
- 2GB RAM
- 20GB storage

**Providers**: DigitalOcean ($6/mo), Hetzner ($4/mo), Vultr ($5/mo)

---

## Rollback Strategy

### If New Deployment Breaks

**Option 1: Pull Specific Version**
```bash
# List available tags
docker images ghcr.io/username/repo/server

# Pull specific SHA version
docker pull ghcr.io/username/repo/server:main-abc123

# Update docker-compose.prod.yml to use specific tag
image: ghcr.io/username/repo/server:main-abc123
```

**Option 2: Revert Git Commit**
```bash
git revert HEAD
git push origin main
# New build automatically triggers with previous code
```

---

## Production Checklist

Before going live:

- [ ] Workflows tested and passing
- [ ] Server package accessible (public or authenticated)
- [ ] VPS has Docker installed
- [ ] VPS authenticated to GitHub Registry
- [ ] `.env` file created with production values
- [ ] Domain pointed to VPS
- [ ] Nginx configured with SSL
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] Health check returns 200 OK
- [ ] Logs showing no errors
- [ ] Client branch deployed (if using)

---

## Summary

✅ **Automated Server Builds** → Docker images in GitHub Registry  
✅ **Automated Client Builds** → Static files in `client` branch  
✅ **Simple VPS Deployment** → Pull image, docker compose up  
✅ **One-Command Updates** → Pull + restart  
✅ **Complete Documentation** → Setup, deploy, maintain, troubleshoot  
✅ **Production Ready** → Logging, restart policies, security  

**Everything is configured and ready to use!**

Just push to main → workflows run automatically → deploy to VPS.
