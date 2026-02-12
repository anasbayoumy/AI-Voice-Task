# Biami.io Hybrid AI Voice Agent

> **Status:** Production-Ready Prototype  
> **Type:** High-Performance WebSocket Relay with Outbound Calling  
> **Stack:** React (Vite) + Node.js (TypeScript) + OpenAI Realtime API + Twilio

---

## Executive Summary

A **low-latency, bidirectional AI voice agent** with support for:
- 🎙️ **Web Voice** - Browser-based conversations via WebRTC
- 📞 **Inbound Calls** - Handle phone calls through Twilio
- 📲 **Outbound Calls** - Programmatic call initiation with context-aware AI
- 🧠 **Function Calling** - AI can execute tools mid-conversation

**Key Differentiators:**
- **<500ms Latency** - Instantaneous, human-like responses
- **Natural Interruptions** - Barge-in support (user can speak over AI)
- **Context-Aware AI** - Different behaviors for Sales, Support, Demo scenarios
- **Secure Architecture** - API keys never exposed to client

---

## Quick Start

### Prerequisites
- Docker Desktop
- Node.js 18+
- Twilio Account ([sign up](https://www.twilio.com/try-twilio))
- OpenAI API Key with Realtime API access
- Ngrok Account ([sign up](https://ngrok.com))

### 1-Minute Setup

```bash
# 1. Clone repo
git clone <your-repo> && cd AI-Voice-Task

# 2. Configure root .env
echo "NGROK_AUTHTOKEN=your_token" > .env

# 3. Configure server/.env (copy example, add credentials)
cd server && cp .env.example .env
# Edit: OPENAI_API_KEY, TWILIO_*, SERVER_PUBLIC_URL

# 4. Start backend
cd .. && docker compose up --build

# 5. Get Ngrok URL
open http://localhost:4040  # Copy HTTPS URL

# 6. Update server/.env with Ngrok URL, restart

# 7. Configure Twilio webhook (see OUTBOUND_SETUP.md)

# 8. Start frontend
cd client && npm install && npm run dev
# Open http://localhost:5173
```

**Full Setup:** See [OUTBOUND_SETUP.md](./OUTBOUND_SETUP.md)

---

## Features

### Web Voice Agent
- Real-time audio streaming (PCM16 24kHz)
- Voice Activity Detection (VAD)
- Barge-in support with volume threshold
- Test mode (no OpenAI costs)

### Phone Integration (Twilio)
- **Inbound**: Answer calls automatically
- **Outbound**: Initiate calls via API
- **Context-Aware**: AI behavior adapts (Sales vs Support)
- **Call Control**: Hang up, status tracking

### AI Capabilities (OpenAI Realtime)
- Low-latency responses (<500ms)
- Function calling: `check_calendar`, `get_biami_info`
- Custom system prompts per context
- Audio transcription available

---

## Architecture

```
┌──────────────┐
│   Browser    │ ← Web Voice (WebSocket)
│   (Client)   │
└──────┬───────┘
       │
┌──────▼──────────┐
│     Ngrok       │ ← Public tunnel (local dev)
│   (Tunnel)      │
└──────┬──────────┘
       │
┌──────▼──────────────────┐
│   Node.js Server        │
│   (Docker Container)    │
│   - WebSocket Relay     │
│   - Audio Transcoding   │
│   - Twilio Integration  │
└──────┬──────────────────┘
       │
       ├─ OpenAI Realtime API (gpt-realtime)
       └─ Twilio Phone Network
```

**Transport Layer:** WebSocket (Web) + Twilio Media Streams (Phone)  
**Intelligence Layer:** OpenAI Realtime API  
**Audio Processing:** PCM16 ↔ G.711 transcoding, 8kHz ↔ 24kHz resampling

---

## Context-Based AI

The AI adapts its behavior based on call context:

| Context   | Behavior                          | Use Case                |
|-----------|----------------------------------|-------------------------|
| **General** | Professional assistant           | Inbound calls, general  |
| **Sales**   | Persuasive, highlights benefits  | Outbound sales calls    |
| **Support** | Patient, helpful troubleshooting | Customer support        |
| **Demo**    | Friendly, schedules meetings     | Demo booking            |

**Example Outbound Call:**
```bash
curl -X POST http://localhost:8080/api/outbound/initiate \
  -H "Content-Type: application/json" \
  -d '{"to": "+15555551234", "context": "sales"}'
```

See [SYSTEM_PROMPTS.md](./SYSTEM_PROMPTS.md) for all prompts and customization.

---

## API Reference

### Outbound Calling

#### `POST /api/outbound/initiate`
Initiates an outbound call.

**Request:**
```json
{
  "to": "+15555551234",
  "context": "sales",
  "from": "+12313993815" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "callSid": "CA123...",
  "status": "queued",
  "to": "+15555551234",
  "from": "+12313993815"
}
```

#### `POST /api/outbound/hangup/:callSid`
Hangs up an active call.

#### `GET /api/outbound/status/:callSid`
Gets call status (queued, ringing, in-progress, completed).

### Webhooks

#### `POST /twilio/voice`
Twilio voice webhook - returns TwiML with WebSocket Stream URL.

#### `POST /api/outbound/status-callback`
Receives call status updates from Twilio.

---

## Project Structure

```
AI-Voice-Task/
├── .env                          # Ngrok auth token
├── docker-compose.yml            # Ngrok + Server orchestration
├── SERVER_ARCHITECTURE.md        # Server structure explanation
├── OUTBOUND_SETUP.md             # Complete setup guide
├── SYSTEM_PROMPTS.md             # AI prompt reference
├── QUICK_START.md                # Command reference
├── server/
│   ├── src/
│   │   ├── index.ts              # Entry point (server init only)
│   │   ├── config/
│   │   │   └── env.ts            # Environment validation
│   │   ├── routes/
│   │   │   ├── index.ts          # Main router
│   │   │   ├── health.ts         # Health check endpoint
│   │   │   ├── cors.ts           # CORS handler
│   │   │   ├── twilio.ts         # Twilio webhook
│   │   │   └── outbound.ts       # Outbound API routes
│   │   ├── handlers/
│   │   │   ├── webHandler.ts     # Browser WebSocket
│   │   │   └── twilioHandler.ts  # Phone WebSocket
│   │   ├── services/
│   │   │   ├── openai.ts         # OpenAI Realtime API
│   │   │   ├── tools.ts          # Function calling
│   │   │   └── twilioOutbound.ts # Twilio API client
│   │   └── utils/
│   │       ├── auth.ts           # API key authentication
│   │       ├── rateLimiter.ts    # Rate limiting
│   │       ├── bodyReader.ts     # Request body parsing
│   │       ├── twilioValidate.ts # Signature validation
│   │       ├── audioTranscode.ts # Audio conversion
│   │       └── logger.ts         # Structured logging
│   ├── .env                      # Credentials (Twilio, OpenAI)
│   ├── Dockerfile
│   └── package.json
└── client/
    ├── src/
    │   ├── components/
    │   │   └── Dialer.tsx        # Outbound dialer UI
    │   ├── lib/
    │   │   └── useVoiceAgent.ts  # Web voice logic
    │   ├── App.tsx               # Mode toggle
    │   └── App.css
    ├── public/
    │   └── AudioProcessor.js     # Audio Worklet
    └── package.json
```

---

## Usage

### Web Voice Agent
1. Open http://localhost:5173
2. Click **"Start Voice"**
3. Allow microphone access
4. Speak naturally - AI responds in real-time

### Outbound Calling
1. Click **"📞 Outbound Dialer"** tab
2. Enter phone number (+1 555 555 1234 or 5555551234)
3. Select context (General, Sales, Support, Demo)
4. Click **"Call Now"**
5. Answer phone and speak with AI
6. AI behavior adapts based on selected context

### Inbound Calling
- Call your Twilio number (+1 231 399 3815)
- AI answers automatically with "General" context
- Speak and hear responses

---

## Cost Estimation

### Twilio (per call)
- **Outbound**: ~$0.013/min (US)
- **Inbound**: ~$0.0085/min (US)
- **Phone number**: ~$1.15/month

### OpenAI Realtime API (per call)
- **Audio input**: $0.10 / 1M tokens (~20 hours)
- **Audio output**: $0.20 / 1M tokens (~10 hours)
- **Average 5-min call**: $0.50-1.00

**💡 Tip:** Use `TEST_MODE=true` in `server/.env` during development to avoid OpenAI costs.

---

## Documentation

### 📖 Understanding the Project
- **[PROJECT_GUIDE.md](./PROJECT_GUIDE.md)** - Complete project overview, architecture, and how everything works
- **[SERVER_ARCHITECTURE.md](./SERVER_ARCHITECTURE.md)** - Professional server structure and layer responsibilities
- **[SERVER_STRUCTURE.md](./SERVER_STRUCTURE.md)** - Visual diagrams and file organization
- **[FUNCTION_REFERENCE.md](./FUNCTION_REFERENCE.md)** - Every function explained in one place
- **[CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md)** - Code cleanup summary and project structure
- **[RESTRUCTURE_COMPLETE.md](./RESTRUCTURE_COMPLETE.md)** - Server restructuring details

### 🚀 Setup & Configuration
- **[OUTBOUND_SETUP.md](./OUTBOUND_SETUP.md)** - Complete setup guide (10 parts)
- **[QUICK_START.md](./QUICK_START.md)** - Command reference
- **[TWILIO_OPENAI_SETUP.md](./TWILIO_OPENAI_SETUP.md)** - Account setup

### 🛠️ Features & Implementation
- **[outbound.md](./outbound.md)** - Outbound calling technical details
- **[SYSTEM_PROMPTS.md](./SYSTEM_PROMPTS.md)** - AI prompt customization
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - What was built

### 🔧 Fixes & Testing
- 🔧 **[COMPLETE_FIX.md](./COMPLETE_FIX.md)** - Latest fixes: Echo, language, audio quality (2026-02-11)
- **[REALTIME_API_FIX_FINAL.md](./REALTIME_API_FIX_FINAL.md)** - OpenAI API session configuration fixes (2026-02-11)
- **[TESTING.md](./TESTING.md)** - Testing guide
- **[TEST_GUIDE.md](./TEST_GUIDE.md)** - Comprehensive test checklist

### 🔒 Security & Production
- 🔒 **[SECURITY.md](./SECURITY.md)** - Production security features (rate limiting, auth, body limits)
- 🚀 **[PRODUCTION_HARDENING_COMPLETE.md](./PRODUCTION_HARDENING_COMPLETE.md)** - Implementation status & deployment checklist

### 🚀 Deployment
- 📦 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete deployment guide for VPS with GitHub Container Registry
- ⚡ **[VPS_QUICK_START.md](./VPS_QUICK_START.md)** - Quick commands for VPS deployment and updates

---

## Security

- ✅ Twilio signature validation
- ✅ Environment variable validation (Zod)
- ✅ E.164 phone number format validation
- ✅ API keys never exposed to client
- ⚠️ **TODO (Production):** Add API authentication, rate limiting, CORS

---

## Troubleshooting

### "Ngrok URL changed"
Free tier gets new URL on restart. Update `server/.env` → `SERVER_PUBLIC_URL` and Twilio webhook.

### "model_not_found"
Verify OpenAI API key has Realtime API access (`gpt-realtime` model).

### "Signature validation failed"
Ensure `SERVER_PUBLIC_URL` in `server/.env` matches your actual Ngrok URL exactly (with `https://`).

### No audio in calls
Check Docker logs: `docker logs -f ai-voice-task-server-1`

**More:** See [OUTBOUND_SETUP.md](./OUTBOUND_SETUP.md) Part 7: Troubleshooting

---

## Next Steps

1. **Test all 4 contexts** (General, Sales, Support, Demo)
2. **Add call recording** (Twilio RecordingSid)
3. **Database integration** (log calls, transcripts)
4. **CRM sync** (Salesforce, HubSpot)
5. **Analytics dashboard** (call metrics, costs)
6. **Production deployment** (replace Ngrok with VPS/cloud)

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes with clear messages
4. Open a pull request

---

## License

MIT

---

## Support

- **Issues:** [GitHub Issues](your-repo-url/issues)
- **Logs:** `docker logs -f ai-voice-task-server-1`
- **Ngrok Dashboard:** http://localhost:4040

---

**Built with:** Node.js, TypeScript, OpenAI Realtime API, Twilio, Docker, Ngrok  
**Developed by:** Anas Bayoumy | Biami.io Voice Agent Prototype
