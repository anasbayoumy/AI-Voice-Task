# Quick VPS Deployment Commands

## Initial Setup (One Time)

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 2. Create project directory
mkdir -p ~/ai-voice-task && cd ~/ai-voice-task

# 3. Login to GitHub Registry
# First, create token at: https://github.com/settings/tokens/new (with read:packages scope)
export GITHUB_TOKEN="ghp_your_token_here"
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# 4. Download docker-compose.prod.yml
curl -o docker-compose.prod.yml https://raw.githubusercontent.com/YOUR_USERNAME/AI-Voice-Task/main/docker-compose.prod.yml

# 5. Create .env file
cat > .env << 'EOF'
GITHUB_REPOSITORY=your-username/ai-voice-task
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
SERVER_PUBLIC_URL=https://yourdomain.com
PORT=8080
API_KEY=your-secret-key
EOF

chmod 600 .env
```

## Deploy/Update Server

```bash
# Pull latest image and restart
cd ~/ai-voice-task
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Test health
curl http://localhost:8080/health
```

## Daily Operations

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart
docker compose -f docker-compose.prod.yml restart

# Stop
docker compose -f docker-compose.prod.yml down

# Check status
docker compose -f docker-compose.prod.yml ps
```
