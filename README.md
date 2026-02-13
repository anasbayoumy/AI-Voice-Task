# Biami Voice Agent - Production-Ready Server

Enterprise-grade AI voice agent with PostgreSQL, security layers, and OpenAI Realtime API integration.

## 🎯 What This Does

A complete voice AI system that acts as a **bridge** between:
- **Phone calls** (via Twilio)
- **Web browsers** (via WebSocket)
- **OpenAI Realtime API** (AI voice processing)

OpenAI handles ALL voice activity detection, noise filtering, pauses, and turn-taking automatically.

## 🏗️ Architecture

```
Browser/Phone → Server (Auth/Validation) → OpenAI Realtime → Response → User
                    ↓
                PostgreSQL (Sessions/Audit)
```

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Copy example env files
cp .env.example .env
cp server/.env.example server/.env

# Edit with your keys
nano server/.env  # Add OPENAI_API_KEY, API_KEY, etc.
```

### 2. Start with Docker

```bash
# Start all services (Postgres, pgAdmin, Server, ngrok)
docker compose up -d

# View logs
docker compose logs -f server

# Get ngrok public URL
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"'
```

### 3. Start Locally (Development)

```bash
cd server
npm install
npm start
```

## 📡 API Endpoints

### HTTP Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Health check |
| GET | `/health` | No | Detailed health (DB, OpenAI) |
| POST | `/api/v1/sessions` | Yes | Create session |
| GET | `/api/v1/sessions/:id` | Yes | Get session |
| DELETE | `/api/v1/sessions/:id` | Yes | End session |
| GET | `/api/v1/sessions/:id/history` | Yes | Get conversation history |
| POST | `/incoming-call` | Twilio Sig | Twilio webhook |

### WebSocket Endpoints

| Path | Auth | Description |
|------|------|-------------|
| `/voice/stream?sessionId=...` | Token | Web voice streaming |
| `/media-stream` | Twilio | Phone Media Stream |

## 🔐 Authentication

Simple header-based auth for web endpoints:

```bash
# Using Authorization header
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:2050/api/v1/sessions

# Using X-API-Key header
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:2050/api/v1/sessions
```

Public endpoints (no auth):
- `/` - Health
- `/health` - Detailed health
- `/incoming-call` - Twilio (validated via signature)
- `/media-stream` - Twilio (implicit)

## 🎤 Voice Activity Detection (VAD)

**OpenAI handles everything** - noise, pauses, interruptions, turn-taking.

You can tune behavior in `.env`:

### Server VAD (Default - Silence Detection)

```bash
VAD_TYPE=server_vad
VAD_THRESHOLD=0.5        # 0-1, higher = less noise sensitivity
VAD_SILENCE_MS=700       # Silence duration before turn ends
VAD_PREFIX_MS=300        # Audio to capture before speech
```

**When to adjust:**
- **Noisy environment**: `VAD_THRESHOLD=0.7`
- **Faster responses**: `VAD_SILENCE_MS=400`
- **Slow speakers**: `VAD_SILENCE_MS=1000`

### Semantic VAD (Alternative - AI Understanding)

```bash
VAD_TYPE=semantic_vad
VAD_EAGERNESS=medium     # low | medium | high | auto
```

Better for natural conversations, less interruption.

## 🗄️ Database Schema

```sql
sessions          # Voice sessions (web/phone)
conversations     # Conversation turns (user/assistant)
audit_log         # Event logging
agent_config      # AI configuration (Biami settings)
```

**pgAdmin** available at `http://localhost:5050`
- Email: admin@biami.io
- Password: admin

## 📦 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| postgres | 5432 | PostgreSQL database |
| pgadmin | 5050 | Database admin UI |
| server | 2050 | Voice agent server |
| ngrok | 4040 | Tunnel + inspect UI |

## 🔧 Environment Variables

See `server/.env.example` for full list. Key variables:

```bash
# Required
OPENAI_API_KEY=sk-proj-...
API_KEY=your-secure-key

# Database
DATABASE_URL=postgresql://...

# VAD tuning (optional)
VAD_THRESHOLD=0.5
VAD_SILENCE_MS=700

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 🧪 Testing

```bash
# Health check
curl http://localhost:2050/

# Detailed health
curl http://localhost:2050/health

# Create session (requires auth)
curl -X POST http://localhost:2050/api/v1/sessions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source": "web"}'
```

## 🔄 Development Workflow

```bash
# Start server with auto-reload
cd server
npm run dev

# Run migrations manually
npm run migrate  # (if you add a migrate script)

# Check types
npm run build
```

## 🐛 Troubleshooting

### Database connection fails
```bash
# Check postgres is running
docker compose ps postgres

# View postgres logs
docker compose logs postgres
```

### OpenAI connection issues
```bash
# Verify API key
echo $OPENAI_API_KEY

# Check server logs
docker compose logs server
```

### Ngrok tunnel
```bash
# Get public URL
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url'

# Or visit
open http://localhost:4040
```

## 📝 Project Structure

```
server/src/
├── config/           # Environment configuration
├── db/
│   ├── client.ts     # PostgreSQL pool
│   ├── migrations/   # SQL migrations
│   └── repositories/ # Data access layer
├── middleware/       # Auth, rate limit, validation
├── validators/       # Zod schemas
├── services/         # Business logic
├── controllers/      # Request handlers
├── routes/           # Route definitions
├── types/            # TypeScript types
└── index.ts          # Entry point
```

## 🚢 Production Deployment

1. Set strong `API_KEY` and `POSTGRES_PASSWORD`
2. Use proper `CORS_ORIGIN` (not `*`)
3. Set `AUTH_REQUIRED=true`
4. Use managed PostgreSQL (AWS RDS, etc.)
5. Deploy behind reverse proxy (nginx, Cloudflare)
6. Monitor with logging/metrics
7. Set up SSL/TLS termination

## 📊 Monitoring

All sessions and events are logged to database:

```sql
-- Recent sessions
SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10;

-- Audit log
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 50;

-- Failed sessions
SELECT * FROM sessions WHERE status = 'error';
```

## 🎯 Next Steps

1. **Web Client**: Build React/Vue component with Web Audio API
2. **Phone Integration**: Configure Twilio phone number webhook
3. **Analytics**: Add dashboards for session metrics
4. **Scaling**: Add Redis for session state if needed

## 📚 Resources

- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Twilio Media Streams](https://www.twilio.com/docs/voice/twiml/stream)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

**Built for Biami.io** - Production-ready AI voice agent infrastructure.
