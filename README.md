# Biami Voice Agent

AI voice agent that bridges **web clients** and **Twilio phone calls** to the **OpenAI Realtime API** for real-time voice conversations.

## Architecture

```
Browser/Phone → Server (Auth, Validation) → OpenAI Realtime API → Response → User
                    ↓
               PostgreSQL (Sessions, Audit)
```

## Tech Stack

### Server
- **Node.js** + **Fastify** — HTTP & WebSocket server
- **PostgreSQL** — Sessions, conversations, audit log
- **OpenAI Realtime API** — Voice processing, VAD, turn-taking
- **TypeScript** — Type safety
- **Docker** — Postgres, pgAdmin, ngrok

### Client
- **React 18** + **TypeScript** — UI
- **Vite** — Build & dev server
- **Tailwind CSS** — Styling
- **Framer Motion** — Animations
- **Web Audio API** — Mic capture, PCM resampling, playback
- **Lucide React** — Icons

## Project Structure

```
AI-Voice-Task/
├── client/
│   ├── src/
│   │   ├── components/     # GeminiOrb, ControlBar
│   │   ├── hooks/          # useVoiceAgent, useAudioVisualizer
│   │   ├── lib/            # utils
│   │   ├── types/          # VoiceAgentMode, etc.
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── config/         # Env & config
│   │   ├── controllers/    # Health, Twilio, VoiceStream, Session
│   │   ├── db/             # Migrations, repositories
│   │   ├── middleware/     # Auth, rate limit, validation
│   │   ├── routes/         # API & WebSocket routes
│   │   ├── services/       # OpenAI, session, audit
│   │   ├── types/
│   │   └── index.ts
│   └── .env.example
├── docker-compose.yml
└── README.md
```

## Quick Start

### 1. Environment

```bash
cp .env.example .env
cp server/.env.example server/.env
# Edit server/.env: OPENAI_API_KEY, API_KEY
```

### 2. Run with Docker

```bash
docker compose up -d
# ngrok URL: curl -s http://localhost:4040/api/tunnels
```

### 3. Run Locally (Development)

```bash
# Server
cd server && npm install && npm start

# Client (new terminal)
cd client && npm install && npm run dev
```

- **Server:** http://localhost:2050  
- **Client:** http://localhost:5173  

## Build

```bash
# Server
cd server && npm run build

# Client
cd client && npm run build
```

## API Endpoints

### HTTP

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Health check |
| GET | `/health` | No | Health (DB, OpenAI) |
| POST | `/api/v1/sessions` | Yes | Create session |
| GET | `/api/v1/sessions/:id` | Yes | Get session |
| DELETE | `/api/v1/sessions/:id` | Yes | End session |
| GET | `/api/v1/sessions/:id/history` | Yes | Conversation history |
| POST | `/incoming-call` | Twilio | Twilio webhook |

### WebSocket

| Path | Auth | Description |
|------|------|-------------|
| `/voice/stream?sessionId=...` | Token | Web voice streaming |
| `/media-stream` | Twilio | Phone media stream |

### Auth

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:2050/api/v1/sessions
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:2050/api/v1/sessions
```

## Client Features

- **Gemini-style UI** — Dark theme, orb visualizer
- **Orb states** — Idle, listening, processing, speaking (volume-driven)
- **ControlBar** — Connect, disconnect, mute
- **Voice selection** — Alloy, Echo, Fable, Onyx, Nova, Shimmer, Coral, Sage
- **Barge-in** — Interrupt AI mid-sentence
- **Responsive** — Desktop & mobile

### Audio Pipeline

**Capture (Mic → Server):**  
Mic → resample 24kHz → Float32 → PCM16 → Base64 → WebSocket

**Playback (Server → Speaker):**  
WebSocket → Base64 → PCM16 → Float32 → buffer → AudioContext → speaker

### WebSocket Messages

**Client → Server:**
```json
{ "type": "start", "clientType": "voice", "voice": "coral" }
{ "type": "audio", "data": "[base64]" }
```

**Server → Client:**
```json
{ "type": "session", "sessionId": "..." }
{ "type": "audio", "data": "[base64]" }
{ "type": "clear" }
{ "type": "error", "message": "..." }
```

## Environment Variables

### Server (server/.env)

```bash
OPENAI_API_KEY=sk-proj-...
API_KEY=your-secure-key
DATABASE_URL=postgresql://...

# Optional
TEST_MODE=false              # true = mock OpenAI, no API calls
VAD_TYPE=server_vad          # or semantic_vad
VAD_THRESHOLD=0.5
VAD_SILENCE_MS=700
CORS_ORIGIN=http://localhost:5173
```

### Client (client/.env)

```bash
VITE_WS_URL=ws://localhost:2050
```

## VAD (Voice Activity Detection)

OpenAI Realtime API handles noise, pauses, turn-taking automatically.

**server_vad:** Silence-based (`VAD_THRESHOLD`, `VAD_SILENCE_MS`)  
**semantic_vad:** AI-based (`VAD_EAGERNESS`: low, medium, high, auto)

## Test Mode

Set `TEST_MODE=true` in server `.env` to:

- Use WebSocket without OpenAI API calls
- Echo audio back for testing
- Run without PostgreSQL

Test client: http://localhost:2050/test/test-client.html

## Docker Services

| Service | Port |
|---------|------|
| postgres | 5432 |
| pgadmin | 5050 |
| server | 2050 |
| ngrok | 4040 |

pgAdmin: http://localhost:5050 (admin@biami.io / admin)

## Database Schema

- `sessions` — Voice sessions (web/phone)
- `conversations` — Conversation turns
- `audit_log` — Event logging
- `agent_config` — AI configuration

## Production Deployment

1. Set strong `API_KEY`, `POSTGRES_PASSWORD`
2. Use proper `CORS_ORIGIN` (avoid `*`)
3. Set `AUTH_REQUIRED=true`
4. Use managed PostgreSQL
5. Deploy behind reverse proxy, SSL termination
6. Add logging/metrics

## Resources

- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [Twilio Media Streams](https://www.twilio.com/docs/voice/twiml/stream)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
