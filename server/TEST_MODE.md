# Test Mode Setup Guide

## Overview

The Biami Voice Agent server includes a **TEST MODE** to help you verify WebSocket connections, audio streaming, and message flow **without making expensive OpenAI API calls**.

## How Test Mode Works

When `TEST_MODE=true` in your `.env` file:

1. ✅ **WebSocket connections work normally** - Full bidirectional communication
2. ✅ **Audio chunks are received** - Server logs all incoming audio
3. ✅ **Echo responses are sent** - Server confirms receipt of each message
4. ❌ **No OpenAI API calls** - Saves money during testing
5. ⚠️ **Database is optional** - Server runs even without PostgreSQL

## Setup

### 1. Enable Test Mode

Edit `server/.env`:

```bash
TEST_MODE=true
```

### 2. Start the Server

```bash
cd server
npm start
```

You should see:

```
⚠️  TEST MODE ENABLED - OpenAI calls will be mocked (no API charges)
   Set TEST_MODE=false to use real OpenAI API
```

### 3. Open the Test Client

Open in your browser:

```
http://localhost:2050/test/test-client.html
```

## Using the Test Client

### Interface Overview

The test client provides:

1. **Connection Status** - Real-time WebSocket state
2. **Message Counters** - Track sent/received messages
3. **Configuration Display** - Server URL and test mode status
4. **Connection Log** - See all WebSocket events in real-time

### Testing Flow

1. **Connect**
   - Enter WebSocket URL: `ws://localhost:2050/voice/stream`
   - Optionally add API key (if `AUTH_REQUIRED=true`)
   - Click "Connect"
   - Watch for connection confirmation

2. **Send Test Messages**
   - Click "Send Test Message" button
   - Each click sends a mock audio chunk
   - Watch the log for echo responses

3. **Verify**
   - Connection status turns green
   - "Messages Sent" counter increments
   - "Messages Received" counter increments
   - Log shows test mode indicators

### Expected Behavior in Test Mode

**When you connect:**
```json
← Received: {"type":"test","message":"Connected in TEST MODE - audio will be echoed back"}
```

**When you send audio:**
```json
→ Sent: {"type":"audio","data":"test-audio-chunk-1707825600000"}
← Received: {"type":"test_echo","message":"Audio chunk received","size":29}
```

## Switching to Real Mode

Once WebSocket testing is complete:

### 1. Disable Test Mode

Edit `server/.env`:

```bash
TEST_MODE=false
```

### 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 3. Restart Server

```bash
npm start
```

You should see:

```
🎙️ Voice Activity Detection (VAD) Configuration:
   Type: server_vad
   Threshold: 0.5 (higher = less sensitive to noise)
   → OpenAI handles ALL noise detection, pauses, and turn-taking
```

## Test Client Features

### Color-Coded Logs

- **Blue** (info) - General messages and events
- **Green** (success) - Received messages from server
- **Orange** (warning) - Connection closed
- **Red** (error) - Errors and failures

### Automatic Health Check

On load, the test client checks:
```
GET http://localhost:2050/health
```

This verifies the server is online and responsive.

### API Key Testing

If your server requires authentication:

1. Set `AUTH_REQUIRED=true` in `.env`
2. Enter your `API_KEY` value in the test client
3. The key will be sent as a query parameter: `?token=your-key`

## Troubleshooting

### Connection Refused

**Problem:** `WebSocket error` or `Server: ✗ Offline`

**Solutions:**
- Verify server is running: `npm start`
- Check the correct port: `2050`
- Verify `TEST_MODE=true` in `.env`

### Authentication Errors

**Problem:** `401 Unauthorized`

**Solutions:**
- Check `AUTH_REQUIRED` setting
- Verify API key matches between `.env` and test client
- For testing, set `AUTH_REQUIRED=false`

### No Echo Responses

**Problem:** Messages sent but no responses received

**Solutions:**
- Verify `TEST_MODE=true` in `.env`
- Check server logs for errors
- Restart server to load new `.env` values

### Database Errors

**Problem:** `Database not available` warning

**Solution:**
- In test mode, this is normal and expected
- Database is optional for WebSocket testing
- To use DB, start: `docker compose up -d postgres`

## What Gets Tested

### ✅ Verified in Test Mode

- WebSocket handshake and connection establishment
- Bidirectional message passing
- Audio chunk transmission format
- Server message handling and routing
- Connection lifecycle (open, message, close, error)
- Client-side WebSocket implementation

### ❌ Not Tested in Test Mode

- OpenAI Realtime API integration
- Voice Activity Detection (VAD) behavior
- Actual AI voice responses
- Audio format conversion
- Real-time audio streaming latency

## Next Steps

After verifying WebSocket connectivity:

1. **Disable Test Mode** - Set `TEST_MODE=false`
2. **Start PostgreSQL** - `docker compose up -d postgres`
3. **Test with Twilio** - Configure ngrok and Twilio webhooks
4. **Test Web Voice** - Build a real client with microphone access

## Code Reference

Test mode is implemented in:

- **Config**: `server/src/config/index.ts` - Reads `TEST_MODE` env var
- **Service**: `server/src/services/openai.service.ts` - Mocks OpenAI responses
- **Test Client**: `server/public/test-client.html` - Full test UI

## API Endpoints

### WebSocket (Voice Stream)

```
ws://localhost:2050/voice/stream
```

**Test Mode Response:**
```json
{
  "type": "test",
  "message": "Connected in TEST MODE - audio will be echoed back"
}
```

### Health Check

```
GET http://localhost:2050/health
```

**Response:**
```json
{
  "status": "degraded",
  "timestamp": "2026-02-13T06:00:00.000Z",
  "checks": {
    "database": "unhealthy",
    "openai": "configured"
  }
}
```

## Summary

Test Mode allows you to:
- ✅ Verify WebSocket infrastructure
- ✅ Test message flow end-to-end
- ✅ Debug client-server communication
- ✅ Save money on OpenAI API calls
- ✅ Develop without external dependencies

Once WebSocket testing is complete, disable test mode to integrate with OpenAI Realtime API for actual voice conversations.
