# Server Documentation — Line-by-Line Guide

This document explains every file, line, and architectural decision in the Biami.io Voice Agent server.

---

## Table of Contents

1. [Entry Point (`src/index.ts`)](#1-entry-point-srcindexts)
2. [Environment Config (`src/config/env.ts`)](#2-environment-config-srcconfigenvts)
3. [Logger (`src/utils/logger.ts`)](#3-logger-srcutilsloggerts)
4. [Twilio Validation (`src/utils/twilioValidate.ts`)](#4-twilio-validation-srcutilstwiliovalidatets)
5. [Audio Transcoding (`src/utils/audioTranscode.ts`)](#5-audio-transcoding-srcutilsaudiotranscodets)
6. [OpenAI Service (`src/services/openai.ts`)](#6-openai-service-srcservicesopenaits)
7. [Tools (`src/services/tools.ts`)](#7-tools-srcservicestoolsts)
8. [Web Handler (`src/handlers/webHandler.ts`)](#8-web-handler-srchandlerswebhandlerts)
9. [Twilio Handler (`src/handlers/twilioHandler.ts`)](#9-twilio-handler-srchandlerstwiliohandlerts)

---

## 1. Entry Point (`src/index.ts`)

The main HTTP + WebSocket server. Handles both HTTP routes (Twilio webhook, health check) and WebSocket connections (web client, phone client).

| Line | Code | Explanation |
|------|------|-------------|
| 1 | `import { WebSocketServer } from 'ws'` | WebSocket server implementation for Node.js. |
| 2 | `import http from 'http'` | Native Node.js HTTP module for creating the server. |
| 3 | `import { config } from './config/env.js'` | Load validated environment variables. |
| 4 | `import { logger } from './utils/logger.js'` | Structured logger. |
| 5–7 | `import { handleWebConnection } from '...'` etc. | Handler functions for WebSocket routes and Twilio validation. |
| 9 | `const server = http.createServer((req, res) => { ... })` | Create raw HTTP server with a request callback. |
| 10 | `const path = (req.url ?? '').split('?')[0]` | Extract URL path (without query string) for routing. |
| 12–16 | `if (req.method === 'GET' && path === '/health')` | **Health endpoint**: responds with `{ status: 'ok', timestamp }` for load balancers, Kubernetes, and monitoring. |
| 14–15 | `res.writeHead(200, ...)` / `res.end(...)` | Return 200 OK and JSON body. |
| 18 | `if ((req.method === 'GET' \|\| 'POST') && path === '/twilio/voice')` | Twilio voice webhook: returns TwiML to connect the call to our WebSocket. |
| 13–19 | `urlForValidation = ...` | Build the URL Twilio used. If `SERVER_PUBLIC_URL` is set (e.g. ngrok), use it; otherwise derive from request headers (proto, host). |
| 21–33 | `validateTwilioRequest(...)` | Validate `X-Twilio-Signature` to ensure the request came from Twilio. Returns 403 if invalid. |
| 36–38 | `const host = ...` / `wsUrl` | Determine host for TwiML `<Stream url="...">`. Uses `TWILIO_WS_URL` or builds `wss://{host}/phone`. |
| 39–45 | `twiml = ...` | XML TwiML telling Twilio to connect the call to our WebSocket. |
| 49–56 | `if (req.method === 'GET')` | Parse query string for GET; pass params to validation. |
| 58–66 | `else` (POST) | Read request body, parse form-urlencoded params, validate. |
| 71–72 | `res.writeHead(404)` / `res.end()` | Unknown paths return 404. |
| 75 | `const wss = new WebSocketServer({ server })` | Attach WebSocket server to the same HTTP server (handles `Upgrade`). |
| 77–90 | `wss.on('connection', ...)` | Route WebSocket connections by path: `/web` → browser voice, `/phone` → Twilio Media Stream. Others are closed. |
| 92–94 | `server.listen(config.PORT, ...)` | Start listening on `PORT` (default 8080). |

---

## 2. Environment Config (`src/config/env.ts`)

Validates and types environment variables at startup using Zod.

| Line | Code | Explanation |
|------|------|-------------|
| 1 | `import { z } from 'zod'` | Schema validation library. |
| 2 | `import dotenv from 'dotenv'` | Loads `.env` into `process.env`. |
| 4 | `dotenv.config()` | Read `.env` from current directory. |
| 6–17 | `const envSchema = z.object({ ... })` | Define schema for all env vars. |
| 7 | `PORT: z.coerce.number().default(8080)` | Server port; coerced from string, default 8080. |
| 8 | `LOG_LEVEL: z.enum([...]).default('info')` | Pino log level. |
| 9 | `OPENAI_API_KEY: z.string().min(1, ...)` | Required; app fails to start if missing. |
| 10–17 | `TWILIO_*`, `SERVER_PUBLIC_URL` | Optional; used when phone mode / ngrok is enabled. |
| 19 | `export const config = envSchema.parse(process.env)` | Parse and validate; throws `ZodError` if invalid. |

---

## 3. Logger (`src/utils/logger.ts`)

Structured logging with Pino.

| Line | Code | Explanation |
|------|------|-------------|
| 1 | `import pino from 'pino'` | Fast JSON logger. |
| 4–11 | `export const logger = pino({ ... })` | Configure Pino. |
| 5 | `level: config.LOG_LEVEL` | Use config log level. |
| 6–9 | `...(config.LOG_LEVEL === 'debug' && process.env.NODE_ENV !== 'production' && { transport: ... })` | Use `pino-pretty` only in debug + non-production (avoids Docker crash when pino-pretty is not installed). |
| 10 | `base: { pid: process.pid }` | Add process ID to each log. |
| 11 | `timestamp: () => \`,"time":"${...}"\`` | Add ISO timestamp to each log. |

---

## 4. Twilio Validation (`src/utils/twilioValidate.ts`)

Validates that HTTP requests to `/twilio/voice` come from Twilio.

| Line | Code | Explanation |
|------|------|-------------|
| 1 | `import twilio from 'twilio'` | Default import (Twilio is CommonJS). |
| 8–17 | `export function validateTwilioRequest(...)` | Wrapper around Twilio’s validation. |
| 13–14 | `if (!authToken \|\| !signature) return false` | Reject if auth token or signature is missing. |
| 16 | `return twilio.validateRequest(authToken, signature, url, params)` | HMAC-SHA1 validation of URL + params against `X-Twilio-Signature`. |

---

## 5. Audio Transcoding (`src/utils/audioTranscode.ts`)

Converts between Twilio’s format (8kHz μ-law) and OpenAI’s format (24kHz PCM16).

| Line | Code | Explanation |
|------|------|-------------|
| 7–8 | `MULAW_BIAS`, `MULAW_CLIP` | Constants for ITU-T G.711 μ-law. |
| 11–19 | `MULAW_DECODE_TABLE` | Lookup table: 256 μ-law bytes → 16-bit linear samples. |
| 21–26 | `mulawToPcm16(mulawBuffer)` | Decode μ-law to PCM16 using the table. |
| 29–40 | `pcm16ToMulaw(sample)` | Encode one PCM16 sample to μ-law. |
| 44–55 | `resampleUp(pcm8k)` | Upsample 8kHz → 24kHz with linear interpolation. |
| 59–65 | `resampleDown(pcm24k)` | Downsample 24kHz → 8kHz by taking every 3rd sample. |
| 69–75 | `twilioToOpenAI(base64Mulaw)` | Base64 μ-law → decode → PCM16 → resample up → base64. |
| 78–89 | `openAIToTwilio(base64Pcm)` | Base64 PCM16 → resample down → μ-law encode → base64. |

---

## 6. OpenAI Service (`src/services/openai.ts`)

The “shared brain”: maintains the WebSocket connection to the OpenAI Realtime API and handles audio + function calls.

| Line | Code | Explanation |
|------|------|-------------|
| 11–17 | `SYSTEM_MESSAGE` | System prompt for the agent. |
| 19–41 | `constructor(...)` | Connect to `wss://api.openai.com/v1/realtime`, pass API key and beta header, attach handlers. |
| 24–25 | `onAudio`, `onText` | Callbacks: `onAudio` streams chunks to the client; `onText` logs transcripts. |
| 44–60 | `handleOpen()` | On connect, send `session.update` with modalities, voice, instructions, PCM16 format, server VAD, and tools. |
| 62–84 | `handleMessage(data)` | Handle OpenAI events: audio delta → `onAudio`, transcript → `onText`, required_action → `handleRequiredAction`, error → log. |
| 86–115 | `handleRequiredAction(response)` | When the model requests tool calls, execute tools, then send `response.submit_tool_outputs`. |
| 118–124 | `sendAudio(base64Audio)` | Append audio to OpenAI’s input buffer. |
| 126–129 | `clearInputBuffer()` | Clear the input buffer on user interrupt (barge-in). |
| 131–135 | `send(data)` | Send JSON to OpenAI if the socket is open. |
| 137–139 | `close()` | Close the WebSocket. |

---

## 7. Tools (`src/services/tools.ts`)

Function definitions and implementations for the Realtime API.

| Line | Code | Explanation |
|------|------|-------------|
| 4–34 | `TOOL_DEFINITIONS` | Schema for `check_calendar` and `get_biami_info` in the format the API expects. |
| 39–45 | `executeCheckCalendar(date)` | Mock: return fixed availability slots. |
| 48–61 | `executeGetBiamiInfo(topic)` | Mock: return predefined Biami.io info by topic. |
| 64–80 | `executeTool(name, args)` | Route to the correct tool and return `{ content: string }`. |

---

## 8. Web Handler (`src/handlers/webHandler.ts`)

Handles WebSocket connections from the browser (24kHz PCM16).

| Line | Code | Explanation |
|------|------|-------------|
| 5 | `export function handleWebConnection(clientWs)` | Called when a client connects to `/web`. |
| 9–17 | `new OpenAIService(onAudio, onText)` | Create one OpenAI connection per client. `onAudio` forwards chunks to the browser. |
| 20–33 | `clientWs.on('message', ...)` | Parse JSON: `input_audio_buffer.append` → send audio to OpenAI; `interrupt` → clear buffer. |
| 36–39 | `clientWs.on('close', ...)` | On disconnect, close the OpenAI connection. |

---

## 9. Twilio Handler (`src/handlers/twilioHandler.ts`)

Handles WebSocket connections from Twilio (8kHz μ-law Media Stream).

| Line | Code | Explanation |
|------|------|-------------|
| 10–11 | `streamSid`, `openAiService` | Store stream ID and OpenAI connection for this call. |
| 13–24 | `sendToTwilio(payload)` | Transcode PCM16 → μ-law, then send Twilio `media` event with `streamSid`. |
| 26–66 | `clientWs.on('message', ...)` | Handle Twilio events: `start` → init OpenAI; `media` (inbound) → transcode and send to OpenAI; `stop` → close. |
| 30–43 | `event === 'start'` | Extract `streamSid`, create `OpenAIService` with `sendToTwilio` as `onAudio`. |
| 46–56 | `event === 'media'` | Inbound track only: transcode μ-law → PCM16, send to OpenAI. |
| 58–61 | `event === 'stop'` | Close OpenAI and clear references. |
| 68–72 | `clientWs.on('close', ...)` | Cleanup on disconnect. |

---

## Architecture Summary

```
                    ┌─────────────────┐
                    │   Browser       │
                    │   (Web Client)  │
                    └────────┬────────┘
                             │ ws://host/web
                             │ PCM16 24kHz
                             ▼
┌──────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Twilio     │      │   Our Server     │      │   OpenAI        │
│   Phone      │──────│   (Node.js)      │──────│   Realtime API  │
│   Call       │ ws   │                  │  ws  │                 │
└──────────────┘ /phone└──────────────────┘      └─────────────────┘
  μ-law 8kHz           HTTP: /health, /twilio/voice
                       WS: /web (PCM16), /phone (μ-law↔PCM16)
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for Realtime API. |
| `PORT` | No | Server port (default: 8080). |
| `LOG_LEVEL` | No | `debug` \| `info` \| `warn` \| `error` (default: `info`). |
| `TWILIO_ACCOUNT_SID` | No | Twilio account SID (phone mode). |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token (signature validation). |
| `TWILIO_PHONE_NUMBER` | No | Twilio phone number. |
| `TWILIO_WS_URL` | No | Public WSS URL for Twilio (e.g. `wss://host/phone`). |
| `SERVER_PUBLIC_URL` | No | Public URL for Twilio validation (e.g. ngrok). |
