# How to Rebuild Docker After Code Changes

When you make code changes to the server, Docker containers need to be rebuilt to include those changes.

## Quick Rebuild

```bash
cd /Users/anas/AI-Voice-Task
docker-compose down
docker-compose up -d --build
```

## What This Does

1. `docker-compose down` - Stops and removes all containers
2. `--build` flag - Forces Docker to rebuild images with your latest code
3. `-d` - Runs containers in background (detached mode)

## Check Logs

```bash
docker-compose logs -f server
```

Look for:
```
🎤 Initializing OpenAI session with voice: [selected_voice]
```

## Development Workflow

**Option 1: Use Local Server (Faster for development)**
```bash
cd server
npm run dev  # or npm start
```
- Changes apply immediately (with tsx watch mode)
- No rebuild needed
- Database might not be available unless Docker Postgres is running

**Option 2: Use Docker (Production-like)**
```bash
docker-compose up -d --build
```
- Requires rebuild after every code change
- Full stack including Postgres, pgAdmin, ngrok
- Slower iteration

## Current Status

✅ Local server is running with the latest voice selector code
❌ Docker was running OLD code (before voice selector was added)

## Recommendation

For testing the voice selector feature:
1. Keep Docker stopped
2. Use the local server that's already running
3. It has all the latest changes compiled
