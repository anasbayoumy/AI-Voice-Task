# Voice Client Usage Guide

## Overview

The Biami Voice Client is a beautiful, Gemini Voice-style interface that lets you have natural voice conversations with GPT-4 Realtime API.

## Access the Client

Open in your browser:
```
http://localhost:2050/test/voice-client.html
```

## Features

### 🎨 Beautiful UI
- Gemini Voice-inspired design
- Purple gradient theme
- Real-time waveform visualizer
- Smooth animations and transitions
- Status badges with color coding

### 🎙️ Voice Features
- **Push-to-talk**: Click microphone to start/stop recording
- **Real-time audio streaming**: Bidirectional PCM16 audio
- **Voice Activity Detection**: OpenAI handles when to speak/listen
- **Natural conversations**: AI responds with voice automatically
- **Interrupt handling**: You can interrupt the AI mid-sentence

### 📊 Live Visualization
- Animated waveform bars
- Pulse animations when listening/speaking
- Connection status indicators
- Message transcript (optional)

## How to Use

### 1. Configure Settings

**Server URL** (default: `ws://localhost:2050/voice/stream`)
- Leave as-is for local development
- Change for production deployment

**API Key** (optional)
- Only needed if `AUTH_REQUIRED=true` in server/.env
- For testing, set `AUTH_REQUIRED=false`

### 2. Connect

Click the **"Connect"** button:
- Status changes to "Connecting..." (orange)
- Microphone permission requested
- Status changes to "Connected" (green)
- Microphone button becomes enabled

### 3. Start Talking

Click the **microphone button** (🎤):
- Button turns red with glow animation
- Status shows "Listening..." (blue)
- Waveform animates
- Speak naturally into your microphone

### 4. AI Responds

- AI processes your speech
- Status shows "AI Speaking..." (purple)
- Audio plays automatically
- Waveform animates during playback

### 5. Natural Conversation

- Click mic again to stop recording
- Wait for AI response
- Click mic to speak again
- Or interrupt AI while it's speaking

## System Requirements

### Browser Support
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari 14+
- ⚠️ Requires HTTPS or localhost for microphone access

### Audio Requirements
- Microphone access (browser will prompt)
- Speakers or headphones
- Quiet environment (for best results)

## Technical Details

### Audio Format
- **Input**: PCM16, 24kHz, mono, 16-bit
- **Output**: PCM16, 24kHz, mono, 16-bit
- **Streaming**: Real-time chunks via WebSocket

### Voice Activity Detection (VAD)
Configured on server side:
```bash
VAD_TYPE=server_vad
VAD_THRESHOLD=0.5
VAD_SILENCE_MS=700
```

OpenAI handles:
- Noise detection
- Silence detection
- Turn-taking
- Pause detection

### WebSocket Protocol

**Client → Server:**
```json
{"type": "start", "clientType": "voice"}
{"type": "audio", "data": "base64-encoded-pcm16"}
```

**Server → Client:**
```json
{"type": "session", "sessionId": "uuid"}
{"type": "audio", "data": "base64-encoded-pcm16"}
```

## Troubleshooting

### Microphone Not Working

**Problem:** Browser doesn't request microphone access

**Solutions:**
- Use HTTPS or localhost
- Check browser permissions: chrome://settings/content/microphone
- Reload page and allow permission

### No Audio Output

**Problem:** Can't hear AI responses

**Solutions:**
- Check speaker volume
- Check browser audio settings
- Verify audio isn't muted in OS
- Try headphones

### Connection Failed

**Problem:** "Failed to connect" error

**Solutions:**
- Verify server is running: `npm start`
- Check server URL: `ws://localhost:2050/voice/stream`
- Verify port 2050 is not blocked
- Check console for errors

### OpenAI Errors

**Problem:** "OpenAI connection error"

**Solutions:**
- Verify `OPENAI_API_KEY` in server/.env
- Check API key has Realtime API access
- Verify `TEST_MODE=false` for real conversations
- Check OpenAI API status

### Audio Quality Issues

**Problem:** Choppy or garbled audio

**Solutions:**
- Use wired internet connection
- Close other bandwidth-heavy apps
- Reduce background noise
- Move closer to microphone

### Latency Issues

**Problem:** Slow responses

**Solutions:**
- Check internet speed
- Adjust VAD settings (lower `VAD_SILENCE_MS`)
- Verify server has good connection to OpenAI
- Consider geographic location (use CDN)

## Configuration

### Adjust VAD Sensitivity

Edit `server/.env`:

**For noisy environments:**
```bash
VAD_THRESHOLD=0.7  # Less sensitive
VAD_SILENCE_MS=1000  # Longer silence required
```

**For quiet environments:**
```bash
VAD_THRESHOLD=0.3  # More sensitive
VAD_SILENCE_MS=500  # Faster responses
```

**For semantic understanding:**
```bash
VAD_TYPE=semantic_vad
VAD_EAGERNESS=high  # Respond quickly
```

### Customize AI Voice

Edit `server/.env`:
```bash
OPENAI_VOICE=alloy    # Options: alloy, echo, shimmer, ash, coral, sage
OPENAI_TEMPERATURE=0.8  # 0-1, higher = more creative
```

### Custom System Message

Edit `server/.env`:
```bash
SYSTEM_MESSAGE="You are a helpful assistant that speaks naturally and concisely."
```

## Keyboard Shortcuts (Coming Soon)

- **Space**: Hold to talk (like Gemini)
- **Esc**: Disconnect
- **M**: Mute/unmute

## Mobile Support

The voice client works on mobile devices:
- **iOS Safari**: Requires HTTPS
- **Android Chrome**: Works on localhost for testing
- **Touch optimized**: Large tap targets

## Privacy & Security

### Audio Data
- Audio streams directly between client and server
- Not stored unless explicitly configured
- Session-based (no persistence by default)

### API Keys
- Sent as query parameter or header
- Use HTTPS in production
- Store in environment variables

### Session Management
- Each connection gets unique session ID
- Sessions tracked in database (if enabled)
- Auto-cleanup on disconnect

## Performance Tips

1. **Use WebSocket compression** (planned)
2. **Optimize VAD settings** for your use case
3. **Use CDN** for static files in production
4. **Enable database** for session persistence
5. **Monitor OpenAI usage** to control costs

## Next Steps

### For Development
1. Test conversation flow
2. Adjust VAD settings
3. Customize AI personality
4. Add transcription display
5. Implement session history

### For Production
1. Deploy to VPS/cloud
2. Enable HTTPS
3. Configure authentication
4. Set up monitoring
5. Add rate limiting
6. Enable database

## Support

For issues or questions:
1. Check server logs: `npm start`
2. Check browser console (F12)
3. Verify environment variables
4. Test with TEST_MODE=true first

## Summary

The voice client provides a production-ready interface for natural voice conversations with GPT-4 Realtime API. It handles all audio streaming, microphone access, and WebSocket communication, giving you a Gemini Voice-like experience with full control over your backend.

Enjoy talking to your AI! 🎙️✨
