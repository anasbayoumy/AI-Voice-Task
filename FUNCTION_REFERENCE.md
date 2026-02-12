# FUNCTION REFERENCE GUIDE

Complete list of every function in the codebase with their purpose.

---

## SERVER FUNCTIONS

### `server/src/index.ts`
- `http.createServer()` - creates and configures http server
- `WebSocketServer()` - creates and configures websocket server
- `server.listen()` - starts http and websocket server

### `server/src/routes/index.ts`
- `handleHttpRequest()` - routes all http requests to appropriate handlers

### `server/src/routes/health.ts`
- `handleHealth()` - returns health status and timestamp

### `server/src/routes/cors.ts`
- `handleCors()` - handles cors preflight requests for /api/* routes

### `server/src/routes/twilio.ts`
- `handleTwilioVoice()` - handles twilio voice webhook and returns twiml xml
- `processTwilioRequest()` - processes twilio request with signature validation

### `server/src/routes/outbound.ts`
- `handleOutboundInitiate()` - initiates outbound call via twilio api
- `handleOutboundHangup()` - terminates active call by setting status to completed
- `handleOutboundStatus()` - fetches current call status from twilio
- `handleStatusCallback()` - receives call lifecycle updates from twilio webhook
- `handleStatusCallbackRoute()` - handles status callback route with signature validation

### `server/src/config/env.ts`
- `envSchema.parse()` - validates and types all environment variables

### `server/src/utils/logger.ts`
- `pino()` - structured json logger with timestamps and process id

### `server/src/utils/rateLimiter.ts`
- `getClientIp()` - extracts client ip from request headers (handles proxies)
- `checkRateLimit()` - checks if request exceeds rate limit and sends 429 if so
- `setInterval()` - cleanup old entries every 5 minutes to prevent memory leak

### `server/src/utils/auth.ts`
- `requireApiKey()` - checks api key from authorization or x-api-key header and rejects if invalid
- `requireWebSocketAuth()` - checks websocket token from query param and closes connection if invalid

### `server/src/utils/bodyReader.ts`
- `readRequestBody()` - reads http request body with size limit to prevent dos attacks

### `server/src/utils/twilioValidate.ts`
- `validateTwilioRequest()` - validates twilio webhook signature to ensure request came from twilio

### `server/src/utils/audioTranscode.ts`
- `mulawToPcm16()` - decodes mulaw bytes to pcm16 samples
- `pcm16ToMulaw()` - encodes pcm16 sample to mulaw byte
- `resampleUp()` - resamples pcm16 from 8khz to 24khz using linear interpolation
- `resampleDown()` - resamples pcm16 from 24khz to 8khz by taking every 3rd sample
- `twilioToOpenAI()` - converts twilio audio (8khz mulaw) to openai format (24khz pcm16)
- `openAIToTwilio()` - converts openai audio (24khz pcm16) to twilio format (8khz mulaw)

### `server/src/services/tools.ts`
- `executeCheckCalendar()` - returns mock calendar availability for given date
- `executeGetBiamiInfo()` - returns company information based on topic
- `executeTool()` - routes tool calls to appropriate handler functions

### `server/src/services/openai.ts`
- `constructor()` - initializes openai websocket connection or test mode
- `handleOpen()` - configures openai session with persona and audio settings
- `handleMessage()` - processes events from openai websocket
- `handleRequiredAction()` - executes tool calls requested by ai and returns results
- `sendAudio()` - sends user audio to openai (appends to buffer)
- `commitAudio()` - commits audio buffer and requests ai response
- `sendGreeting()` - triggers ai to greet user without input
- `clearInputBuffer()` - clears audio buffer and cancels any ongoing ai response
- `isAIResponding()` - returns true if ai is currently generating response
- `send()` - sends json message to openai websocket
- `close()` - closes websocket connection to openai

### `server/src/handlers/webHandler.ts`
- `handleWebConnection()` - handles browser voice websocket connections at /web
- `calculateVolume()` - calculates rms volume from base64 pcm16 audio
- `clientWs.on('message')` - processes incoming audio from browser and detects silence
- `clientWs.on('close')` - cleanup on disconnect

### `server/src/handlers/twilioHandler.ts`
- `getInstructionsForContext()` - returns context-specific ai personality instructions
- `handleTwilioConnection()` - handles phone call websocket connections at /phone from twilio
- `sendToTwilio()` - transcodes openai audio to mulaw and sends to twilio
- `clientWs.on('message')` - processes twilio media stream events
- `clientWs.on('close')` - cleanup on disconnect

### `server/src/routes/outbound.ts`
- `handleOutboundInitiate()` - initiates outbound call via twilio api
- `handleOutboundHangup()` - terminates active call by setting status to completed
- `handleOutboundStatus()` - fetches current call status from twilio
- `handleStatusCallback()` - receives call lifecycle updates from twilio webhook

### `server/src/services/twilioOutbound.ts`
- `makeOutboundCall()` - initiates outbound call via twilio api
- `hangupCall()` - terminates active call by setting status to completed
- `getCallStatus()` - fetches call details from twilio api

---

## CLIENT FUNCTIONS

### `client/src/lib/useVoiceAgent.ts`
- `getVolumeFromBase64Pcm()` - calculates rms volume from base64 pcm16 audio
- `useVoiceAgent()` - main react hook for voice agent functionality
- `clearAudioQueue()` - stops audio playback and clears queue
- `playAudioChunk()` - plays audio chunk and queues next chunk when finished
- `connect()` - establishes mic access, websocket connection, and audio pipeline
- `workletNode.port.onmessage` - processes mic audio chunks and handles barge-in detection
- `ws.onopen` - sets connection timestamp
- `ws.onmessage` - receives ai audio and queues for playback
- `ws.onerror` - handles websocket errors
- `ws.onclose` - cleanup on disconnect
- `disconnect()` - closes websocket and stops microphone

### `client/src/components/MarcinAgent.tsx`
- `MarcinAgent()` - main ui component for browser voice chat
- `handleDoorClick()` - connects when user clicks door
- `handleExitClick()` - disconnects when user clicks exit
- `useEffect()` (first) - handles entering transition animation
- `useEffect()` (second) - handles sprite animation based on ai speaking state

### `client/src/components/Dialer.tsx`
- `Dialer()` - main ui component for outbound phone calls
- `handleCall()` - initiates outbound call via api
- `handleHangup()` - terminates active call
- `handleStatusCheck()` - fetches current call status

### `client/src/App.tsx`
- `App()` - main app component with mode switcher (voice/dialer)

### `client/src/main.tsx`
- `createRoot()` - react app entry point

---

## AUDIOWORKLET FUNCTION

### `public/AudioProcessor.js`
- `AudioProcessor` - processes microphone audio in real-time
- `process()` - converts float32 audio to pcm16 and sends to main thread

---

## KEY PATTERNS

### Audio Flow
```
Mic → AudioWorklet → Resample → Base64 → WebSocket → Server → OpenAI
OpenAI → Server → Base64 → WebSocket → Decode → AudioBuffer → Speakers
```

### Silence Detection
```
1. Calculate volume from PCM16
2. If volume > 150: User is speaking
3. If silence for ~1 second: Commit audio
4. OpenAI processes and responds
```

### Barge-in Logic
```
1. AI is playing audio
2. User speaks loudly (volume > 300)
3. Clear audio queue
4. Send interrupt to server
5. Server cancels AI response
6. Mic input resumes
```

### Context-Aware AI
```
1. Outbound call initiated with context param
2. Server extracts context from URL
3. getInstructionsForContext() returns personality
4. OpenAI session configured with custom instructions
```

---

**Purpose**: This file helps you quickly find what each function does without reading the entire codebase.
