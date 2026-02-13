# 🚀 Quick Start Guide

## 1. Environment Setup (2 minutes)

```bash
# Copy environment files
cp .env.example .env
cp server/.env.example server/.env

# Edit server/.env and add your keys
nano server/.env
```

**Required in `server/.env`:**
```bash
OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE
API_KEY=your-secure-api-key-change-me
```

## 2. Start Everything (1 minute)

```bash
# Start all services (Postgres, pgAdmin, Server, ngrok)
docker compose up -d

# Wait 10 seconds for services to start
sleep 10

# Check everything is running
docker compose ps
```

## 3. Get Your Public URL (30 seconds)

```bash
# Get ngrok tunnel URL
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1

# Or open ngrok dashboard
open http://localhost:4040
```

## 4. Test the Server (30 seconds)

```bash
# Health check
curl http://localhost:2050/

# Detailed health (DB + OpenAI check)
curl http://localhost:2050/health

# Create a session (replace YOUR_API_KEY)
curl -X POST http://localhost:2050/api/v1/sessions \
  -H "Authorization: Bearer your-secure-api-key-change-me" \
  -H "Content-Type: application/json" \
  -d '{"source": "web"}'
```

## 5. View Logs

```bash
# All services
docker compose logs

# Just server
docker compose logs -f server

# Just postgres
docker compose logs postgres
```

## 6. Access pgAdmin

Open http://localhost:5050
- **Email**: admin@biami.io
- **Password**: admin

Add server connection:
- **Host**: postgres
- **Port**: 5432
- **User**: biami
- **Password**: biami_secure_pass
- **Database**: biami_voice

## 7. Stop Everything

```bash
# Stop all services
docker compose down

# Stop and remove volumes (fresh start)
docker compose down -v
```

---

## Troubleshooting

### Port already in use
```bash
# Kill process on port 2050
lsof -ti:2050 | xargs kill -9

# Rebuild and start
docker compose up -d --build
```

### Database connection failed
```bash
# Check postgres is healthy
docker compose ps postgres

# Restart postgres
docker compose restart postgres
```

### Can't reach server
```bash
# Check server logs
docker compose logs server

# Restart server
docker compose restart server
```

### Need fresh database
```bash
# Remove volumes and restart
docker compose down -v
docker compose up -d
```

---

## What's Running?

| Service | URL | Description |
|---------|-----|-------------|
| Server | http://localhost:2050 | Voice agent API |
| pgAdmin | http://localhost:5050 | Database admin |
| ngrok UI | http://localhost:4040 | Tunnel dashboard |
| PostgreSQL | localhost:5432 | Database (internal) |

---

## Next: Configure Twilio

1. Get your ngrok URL: `https://xxxx.ngrok-free.app`
2. Go to Twilio Console → Phone Numbers
3. Set webhook: `https://xxxx.ngrok-free.app/incoming-call`
4. Call your Twilio number!

---

That's it! Your production voice agent is running. 🎉
