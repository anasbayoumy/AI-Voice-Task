# SERVER STRUCTURE VISUALIZATION

## Directory Tree (New Structure)

```
server/src/
│
├── 📄 index.ts (30 lines)
│   └── Entry point - server initialization only
│
├── 📁 config/
│   └── 📄 env.ts
│       └── Environment variable validation with Zod
│
├── 📁 routes/ ⭐ NEW ORGANIZED STRUCTURE
│   ├── 📄 index.ts
│   │   └── Main HTTP router - dispatches to handlers
│   ├── 📄 health.ts
│   │   └── GET /health
│   ├── 📄 cors.ts
│   │   └── OPTIONS /api/*
│   ├── 📄 twilio.ts
│   │   └── GET/POST /twilio/voice
│   └── 📄 outbound.ts
│       ├── POST /api/outbound/initiate
│       ├── POST /api/outbound/hangup/:callSid
│       ├── GET /api/outbound/status/:callSid
│       └── POST /api/outbound/status-callback
│
├── 📁 handlers/
│   ├── 📄 webHandler.ts
│   │   └── WebSocket /web (browser voice)
│   └── 📄 twilioHandler.ts
│       └── WebSocket /phone (twilio calls)
│
├── 📁 services/
│   ├── 📄 openai.ts
│   │   └── OpenAI Realtime API client
│   ├── 📄 twilioOutbound.ts
│   │   └── Twilio API client (make calls)
│   └── 📄 tools.ts
│       └── Function calling (calendar, info)
│
└── 📁 utils/
    ├── 📄 auth.ts
    │   └── API key authentication
    ├── 📄 rateLimiter.ts
    │   └── Rate limiting per IP
    ├── 📄 bodyReader.ts
    │   └── HTTP body parsing with size limits
    ├── 📄 twilioValidate.ts
    │   └── Webhook signature validation
    ├── 📄 audioTranscode.ts
    │   └── μ-law ↔ PCM16 conversion
    └── 📄 logger.ts
        └── Pino structured logging
```

---

## Request Flow Diagrams

### HTTP Request: Health Check
```
┌─────────┐
│ Client  │
└────┬────┘
     │ GET /health
     ▼
┌──────────────────┐
│   index.ts       │ ← Entry point
│  (30 lines)      │
└────┬─────────────┘
     │ handleHttpRequest()
     ▼
┌──────────────────┐
│ routes/index.ts  │ ← Router
│  (80 lines)      │
└────┬─────────────┘
     │ if (path === '/health')
     ▼
┌──────────────────┐
│ routes/health.ts │ ← Handler
│  (10 lines)      │
└────┬─────────────┘
     │ return JSON
     ▼
┌─────────┐
│ Client  │ ← { status: 'ok' }
└─────────┘
```

### HTTP Request: Outbound Call
```
┌─────────┐
│ Client  │
└────┬────┘
     │ POST /api/outbound/initiate
     ▼
┌────────────────────┐
│    index.ts        │
└────┬───────────────┘
     │
     ▼
┌────────────────────┐
│  routes/index.ts   │
└────┬───────────────┘
     │ requireApiKey()
     │ checkRateLimit()
     ▼
┌────────────────────┐
│ routes/outbound.ts │
└────┬───────────────┘
     │ validate phone
     │ parse JSON
     ▼
┌─────────────────────────┐
│ services/twilioOutbound │
└────┬────────────────────┘
     │ call Twilio API
     ▼
┌─────────────┐
│ Twilio API  │
└────┬────────┘
     │ return callSid
     ▼
┌─────────┐
│ Client  │ ← { success: true, callSid: 'CA...' }
└─────────┘
```

### WebSocket: Browser Voice
```
┌─────────┐
│ Browser │
└────┬────┘
     │ WebSocket /web
     ▼
┌──────────────────┐
│   index.ts       │
│  wss.on('conn')  │
└────┬─────────────┘
     │ requireWebSocketAuth()
     ▼
┌──────────────────────┐
│ handlers/webHandler  │
└────┬─────────────────┘
     │ new OpenAIService()
     │
     ├─────────────────┐
     │ Audio Loop:     │
     │ 1. Mic → Server │
     │ 2. Server →     │
     ▼    OpenAI       │
┌──────────────────────┴─┐
│ services/openai.ts     │
│  (OpenAI WebSocket)    │
└────┬───────────────────┘
     │ AI response audio
     ▼
┌──────────────────────┐
│ handlers/webHandler  │
│  ws.send(audio)      │
└────┬─────────────────┘
     │
     ▼
┌─────────┐
│ Browser │ ← Speakers play AI voice
└─────────┘
```

---

## Layer Interaction Matrix

| Layer | Calls | Called By | Purpose |
|-------|-------|-----------|---------|
| **index.ts** | routes/index.ts, handlers/* | (entry) | Server init |
| **routes/** | services/*, utils/auth, utils/rateLimiter | index.ts | HTTP routing |
| **handlers/** | services/openai | index.ts | WebSocket mgmt |
| **services/** | External APIs | routes/, handlers/ | Business logic |
| **utils/** | - | routes/, services/ | Helpers |

---

## Before vs After: Visual Comparison

### BEFORE (Monolithic)
```
┌─────────────────────────────────────────────────┐
│                                                 │
│               index.ts (250 lines)              │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Server setup                              │ │
│  ├───────────────────────────────────────────┤ │
│  │ Health check handler                      │ │
│  ├───────────────────────────────────────────┤ │
│  │ CORS handler                              │ │
│  ├───────────────────────────────────────────┤ │
│  │ Twilio webhook (80 lines)                 │ │
│  │  - Signature validation                   │ │
│  │  - TwiML generation                       │ │
│  │  - Context handling                       │ │
│  ├───────────────────────────────────────────┤ │
│  │ Outbound API (100+ lines)                 │ │
│  │  - /initiate handler                      │ │
│  │  - /hangup handler                        │ │
│  │  - /status handler                        │ │
│  │  - /status-callback handler               │ │
│  ├───────────────────────────────────────────┤ │
│  │ WebSocket routing                         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ❌ Hard to navigate                            │
│  ❌ Hard to test                                │
│  ❌ Hard to maintain                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### AFTER (Layered & Professional)
```
┌──────────────────┐
│  index.ts (30)   │ ← Clean entry point
└────────┬─────────┘
         │
    ┌────▼─────────────────────────────────┐
    │         routes/ (Organized)          │
    │                                      │
    │  ┌────────────┐  ┌──────────────┐  │
    │  │ index.ts   │  │  health.ts   │  │
    │  │ (router)   │  │  (10 lines)  │  │
    │  └────────────┘  └──────────────┘  │
    │                                      │
    │  ┌────────────┐  ┌──────────────┐  │
    │  │  cors.ts   │  │  twilio.ts   │  │
    │  │ (8 lines)  │  │  (90 lines)  │  │
    │  └────────────┘  └──────────────┘  │
    │                                      │
    │  ┌────────────────────────────┐    │
    │  │     outbound.ts (200)      │    │
    │  │   All outbound API logic   │    │
    │  └────────────────────────────┘    │
    │                                      │
    └──────────────────────────────────────┘
         │
    ┌────▼─────────┐
    │  services/   │ ← Business logic
    └──────────────┘
         │
    ┌────▼─────────┐
    │   utils/     │ ← Helpers
    └──────────────┘

✅ Easy to navigate
✅ Easy to test
✅ Easy to maintain
✅ Professional structure
```

---

## Code Organization Principles

### 1. **Single Responsibility**
```
routes/health.ts     → ONLY health checks
routes/twilio.ts     → ONLY Twilio webhook
routes/outbound.ts   → ONLY outbound API
```

### 2. **Clear Dependencies**
```
index.ts
  → routes/
      → services/
          → utils/
```
*Top-level never imports from lower levels*

### 3. **Testable Units**
```typescript
// ✅ Easy to test
import { handleHealth } from './routes/health';
test('returns 200 OK', () => { ... });

// ❌ Hard to test (before)
// Had to start entire server to test one route
```

### 4. **Minimal Entry Point**
```typescript
// index.ts is now just:
const server = http.createServer(handleHttpRequest);
const wss = new WebSocketServer({ server });
server.listen(PORT);
```

---

## File Size Breakdown

| File | Lines | Purpose |
|------|-------|---------|
| `index.ts` | 30 | Entry point |
| `routes/index.ts` | 80 | Main router |
| `routes/health.ts` | 10 | Health endpoint |
| `routes/cors.ts` | 8 | CORS preflight |
| `routes/twilio.ts` | 90 | Twilio webhook |
| `routes/outbound.ts` | 200 | Outbound API |
| **Total routes** | **418** | **All HTTP logic** |

**Impact**: Reduced entry point from 250 lines to 30 lines (88% reduction)

---

## Key Improvements

### ✅ Discoverability
**Before**: "Where's the outbound API code?" → Search 250 lines  
**After**: "Where's the outbound API code?" → `routes/outbound.ts`

### ✅ Isolation
**Before**: Change health check → risk breaking Twilio logic  
**After**: Change health check → only affects `routes/health.ts`

### ✅ Testing
**Before**: Mock entire server to test one endpoint  
**After**: Import and test individual route handlers

### ✅ Onboarding
**Before**: New developer reads 250-line file  
**After**: New developer navigates organized folders

---

## Summary

The server is now structured like **professional production applications**:

```
Enterprise Node.js ✓
Express.js apps    ✓
NestJS projects    ✓
Industry standard  ✓
```

**No functionality changed. Only organization improved.**
