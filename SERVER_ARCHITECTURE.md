# SERVER ARCHITECTURE - PROFESSIONAL STRUCTURE

## Overview
The server has been restructured to follow professional Node.js/Express-style architecture with proper separation of concerns.

---

## New Directory Structure

```
server/src/
├── index.ts                    # Entry point - server initialization only
├── config/
│   └── env.ts                  # Environment configuration
├── routes/
│   ├── index.ts                # Main router - dispatches to route handlers
│   ├── health.ts               # Health check endpoint
│   ├── cors.ts                 # CORS preflight handler
│   ├── twilio.ts               # Twilio voice webhook
│   └── outbound.ts             # Outbound calling API routes
├── handlers/
│   ├── webHandler.ts           # Browser WebSocket connections
│   └── twilioHandler.ts        # Phone call WebSocket connections
├── services/
│   ├── openai.ts               # OpenAI Realtime API client
│   ├── twilioOutbound.ts       # Twilio API client
│   └── tools.ts                # Function calling tools
└── utils/
    ├── auth.ts                 # API key authentication
    ├── rateLimiter.ts          # Rate limiting
    ├── bodyReader.ts           # Request body parsing
    ├── twilioValidate.ts       # Webhook signature validation
    ├── audioTranscode.ts       # Audio format conversion
    └── logger.ts               # Structured logging
```

---

## Layer Responsibilities

### 1. **Entry Point** (`index.ts`)
**Purpose**: Server initialization and configuration only.

**Responsibilities:**
- Create HTTP server
- Create WebSocket server
- Register route handler
- Register WebSocket handler
- Start server

**Does NOT contain:**
- Route logic
- Business logic
- Request parsing

```typescript
// ✅ Clean entry point
const server = http.createServer((req, res) => {
  handleHttpRequest(req, res, CORS_HEADERS);
});

const wss = new WebSocketServer({ server });
wss.on('connection', handleWebSocketConnection);

server.listen(config.PORT);
```

---

### 2. **Routes Layer** (`routes/`)
**Purpose**: HTTP request routing and orchestration.

**Files:**
- `routes/index.ts` - Main router, dispatches to specialized handlers
- `routes/health.ts` - Health check endpoint
- `routes/cors.ts` - CORS preflight
- `routes/twilio.ts` - Twilio voice webhook
- `routes/outbound.ts` - Outbound calling API

**Responsibilities:**
- Match URL paths to handlers
- Apply middleware (auth, rate limiting)
- Parse URL parameters
- Call appropriate service functions
- Format HTTP responses

**Does NOT contain:**
- Business logic (lives in services/)
- WebSocket logic (lives in handlers/)
- Direct database access

```typescript
// ✅ Router orchestrates, doesn't implement
export function handleHttpRequest(req, res, cors) {
  const path = (req.url ?? '').split('?')[0];
  
  if (path === '/health') {
    handleHealth(req, res, cors);
  } else if (path === '/api/outbound/initiate') {
    if (!requireApiKey(req, res, cors)) return;
    if (!checkRateLimit(req, res, 'initiate', cors)) return;
    handleOutboundInitiate(req, res, cors);
  }
  // ... more routes
}
```

---

### 3. **Handlers Layer** (`handlers/`)
**Purpose**: WebSocket connection management.

**Files:**
- `handlers/webHandler.ts` - Browser voice connections
- `handlers/twilioHandler.ts` - Phone call connections

**Responsibilities:**
- Manage WebSocket lifecycle
- Parse WebSocket messages
- Call OpenAI service
- Handle real-time audio streaming
- Implement silence detection

**Does NOT contain:**
- HTTP route logic
- OpenAI API implementation (delegates to services/openai.ts)

```typescript
// ✅ Handler manages WebSocket, delegates to service
export function handleWebConnection(ws: WebSocket) {
  const openAiService = new OpenAIService(
    (audio) => ws.send(JSON.stringify({ type: 'audio', payload: audio })),
    (text) => logger.info(`AI: ${text}`)
  );
  
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'input_audio_buffer.append') {
      openAiService.sendAudio(msg.audio);
    }
  });
}
```

---

### 4. **Services Layer** (`services/`)
**Purpose**: Business logic and external API integration.

**Files:**
- `services/openai.ts` - OpenAI Realtime API client
- `services/twilioOutbound.ts` - Twilio API client
- `services/tools.ts` - Function calling implementation

**Responsibilities:**
- Implement business logic
- Integrate with external APIs
- Manage stateful connections (OpenAI WebSocket)
- Execute function calls

**Does NOT contain:**
- HTTP routing
- WebSocket connection management
- Direct request/response handling

```typescript
// ✅ Service encapsulates OpenAI API logic
export class OpenAIService {
  private ws: WebSocket;
  
  constructor(onAudio, onText) {
    this.ws = new WebSocket('wss://api.openai.com/v1/realtime');
    this.ws.on('message', this.handleMessage.bind(this));
  }
  
  sendAudio(audio: string) { /* ... */ }
  commitAudio() { /* ... */ }
  clearInputBuffer() { /* ... */ }
}
```

---

### 5. **Utils Layer** (`utils/`)
**Purpose**: Reusable utility functions.

**Responsibilities:**
- Authentication helpers
- Rate limiting logic
- Request body parsing
- Signature validation
- Audio transcoding
- Logging

**Does NOT contain:**
- Business logic
- Route handlers
- Service implementations

```typescript
// ✅ Pure utility function
export function checkRateLimit(req, res, scope, cors): boolean {
  const ip = getClientIp(req);
  const entry = rateLimitMap.get(`${scope}:${ip}`);
  
  if (entry && entry.count > MAX_REQUESTS) {
    res.writeHead(429, { ...cors });
    res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
    return false;
  }
  
  return true;
}
```

---

## Benefits of This Structure

### ✅ Separation of Concerns
Each layer has a single, well-defined responsibility:
- **Routes**: HTTP routing
- **Handlers**: WebSocket management
- **Services**: Business logic
- **Utils**: Reusable helpers

### ✅ Testability
Easy to unit test each layer in isolation:
```typescript
// Test route without starting server
import { handleHealth } from './routes/health';
const mockReq = { method: 'GET', url: '/health' };
const mockRes = { writeHead: jest.fn(), end: jest.fn() };
handleHealth(mockReq, mockRes);
expect(mockRes.writeHead).toHaveBeenCalledWith(200);
```

### ✅ Maintainability
- Clear file organization
- Easy to find specific functionality
- Changes isolated to appropriate layer

### ✅ Scalability
- Easy to add new routes (`routes/`)
- Easy to add new services (`services/`)
- Easy to add new utilities (`utils/`)

### ✅ Readability
- `index.ts` is now ~50 lines (was ~250)
- Each route file has single responsibility
- Clear naming conventions

---

## Migration Summary

### Before (Monolithic)
```
index.ts (250 lines)
├── Server creation
├── Health check handler
├── CORS handler
├── Twilio webhook handler (80 lines)
├── Outbound API handlers (100+ lines)
└── WebSocket routing
```

### After (Layered)
```
index.ts (30 lines)
routes/
├── index.ts (80 lines) - Router
├── health.ts (10 lines)
├── cors.ts (8 lines)
├── twilio.ts (90 lines)
└── outbound.ts (200 lines)
```

---

## Request Flow Examples

### HTTP Request (Health Check)
```
1. Client → HTTP GET /health
2. index.ts → handleHttpRequest()
3. routes/index.ts → handleHealth()
4. routes/health.ts → return JSON
5. Client ← { status: 'ok' }
```

### HTTP Request (Outbound Call)
```
1. Client → POST /api/outbound/initiate
2. index.ts → handleHttpRequest()
3. routes/index.ts → checks auth, rate limit
4. routes/index.ts → handleOutboundInitiate()
5. routes/outbound.ts → makeOutboundCall()
6. services/twilioOutbound.ts → Twilio API
7. Client ← { success: true, callSid: 'CA...' }
```

### WebSocket (Browser Voice)
```
1. Client → WebSocket connect /web
2. index.ts → wss.on('connection')
3. index.ts → handleWebConnection()
4. handlers/webHandler.ts → new OpenAIService()
5. Client → audio chunks
6. handlers/webHandler.ts → openAiService.sendAudio()
7. services/openai.ts → OpenAI WebSocket
8. OpenAI → audio response
9. services/openai.ts → onAudio callback
10. handlers/webHandler.ts → ws.send()
11. Client ← audio chunks
```

---

## Best Practices Applied

### 1. **Single Responsibility Principle**
Each file/function does one thing:
- `routes/health.ts` - Only health checks
- `routes/twilio.ts` - Only Twilio webhook
- `services/openai.ts` - Only OpenAI API

### 2. **Dependency Injection**
Services receive dependencies via constructor:
```typescript
const openAiService = new OpenAIService(
  (audio) => sendToClient(audio),  // Injected callback
  (text) => logger.info(text)      // Injected logger
);
```

### 3. **Consistent Error Handling**
All route handlers use same pattern:
```typescript
try {
  const result = await service.doSomething();
  res.writeHead(200, cors);
  res.end(JSON.stringify(result));
} catch (error) {
  logger.error({ error }, 'Operation failed');
  res.writeHead(500, cors);
  res.end(JSON.stringify({ error: 'Message' }));
}
```

### 4. **Type Safety**
TypeScript interfaces for everything:
```typescript
type CorsHeaders = Record<string, string>;
interface MakeCallParams { to: string; context?: string; }
```

---

## Adding New Features

### Example: Add New API Endpoint

**1. Create route handler** (`routes/analytics.ts`):
```typescript
export async function handleAnalytics(req, res, cors) {
  const data = await getAnalyticsData();
  res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
```

**2. Register in router** (`routes/index.ts`):
```typescript
if (path === '/api/analytics') {
  if (!requireApiKey(req, res, cors)) return;
  handleAnalytics(req, res, cors);
  return;
}
```

**3. Implement service** (`services/analytics.ts`):
```typescript
export async function getAnalyticsData() {
  // Business logic here
}
```

**Done!** No changes to `index.ts`.

---

## Conclusion

This restructure transforms the server from a monolithic file into a professional, maintainable architecture following industry best practices:

- ✅ **Clear separation of concerns**
- ✅ **Easy to test**
- ✅ **Easy to maintain**
- ✅ **Easy to scale**
- ✅ **Production-ready**

The structure now mirrors professional Express.js and NestJS applications while maintaining the lightweight nature of raw Node.js HTTP server.
