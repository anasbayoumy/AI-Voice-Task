# Voice Selector Feature

## Overview

The web voice client now includes a dropdown selector that allows users to choose from all available OpenAI Realtime API voices before connecting.

## Available Voices

### Original Voices
- **Alloy** (Neutral) - Default
- **Echo** (Neutral)
- **Fable** (British)
- **Onyx** (Masculine)
- **Nova** (Feminine)
- **Shimmer** (Feminine)

### New Expressive Voices
- **Ash** (Masculine)
- **Ballad** (Expressive)
- **Coral** (Feminine)
- **Sage** (Neutral)
- **Verse** (Expressive)

## How It Works

### User Flow

1. User opens the web voice client at `http://localhost:2050/test/voice-client.html`
2. User selects their preferred voice from the **AI Voice** dropdown in Settings
3. User clicks **Connect**
4. The selected voice is sent as a query parameter: `?voice=coral`
5. The AI responds using the selected voice for the entire session

### Technical Implementation

#### 1. Frontend (`server/public/voice-client.html`)

- Added voice dropdown with all 11 available voices grouped by type
- Extracts selected voice on connect and appends to WebSocket URL as query param
- Styled dropdown to match the existing UI design

#### 2. Route (`server/src/routes/voice.routes.ts`)

- Extracts `voice` parameter from query string
- Passes it to the controller alongside `sessionId`

#### 3. Controller (`server/src/controllers/voiceStream.controller.ts`)

- Accepts optional `voice` parameter
- Logs the selected voice in audit trail
- Passes voice to `OpenAIService` constructor

#### 4. Service (`server/src/services/openai.service.ts`)

- Added `voiceOverride` property
- Constructor accepts optional `voiceOverride` parameter
- In `initializeSession()`, uses `voiceOverride ?? config.openai.voice`
- Logs selected voice in console for debugging

## Query Parameters

The WebSocket connection now supports:

```
ws://localhost:2050/voice/stream?voice=coral&token=YOUR_TOKEN
```

**Parameters:**
- `voice` - Voice name (optional, defaults to `OPENAI_VOICE` from `.env`)
- `token` - API key (optional if `AUTH_REQUIRED=false`)
- `sessionId` - Resume existing session (optional)

## Limitations

⚠️ **Voice cannot be changed mid-session.** OpenAI locks the voice after the first agent response. To use a different voice, disconnect and reconnect with a new voice selection.

## Environment Variable

The default voice is still controlled by:

```env
OPENAI_VOICE=alloy
```

This is used when:
- No voice parameter is provided
- Twilio phone calls (use default)
- Any other integration without explicit voice selection

## Testing

1. Start the server: `cd server && npm start`
2. Open: `http://localhost:2050/test/voice-client.html`
3. Select different voices and test conversations
4. Verify the server logs show: `🎤 Initializing OpenAI session with voice: coral`

## UI Preview

The voice selector appears in the Settings panel above the Server URL field:

```
⚙️ Settings
┌─────────────────────────────┐
│ AI Voice                    │
│ ┌─────────────────────────┐ │
│ │ Alloy (Neutral)        ▼│ │
│ └─────────────────────────┘ │
│                             │
│ Server URL                  │
│ ┌─────────────────────────┐ │
│ │ ws://localhost:2050/... │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## Backward Compatibility

✅ All existing functionality is preserved:
- Twilio calls use default voice from `.env`
- Existing sessions without voice param work normally
- No breaking changes to API

## Related Files

- `server/public/voice-client.html` - UI and client logic
- `server/src/routes/voice.routes.ts` - Route parameter extraction
- `server/src/controllers/voiceStream.controller.ts` - Controller logic
- `server/src/services/openai.service.ts` - OpenAI session initialization
- `server/src/config/index.ts` - Default voice configuration
