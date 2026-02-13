# Docker setup for Twilio testing

## Prerequisites

- `server/.env` with `OPENAI_API_KEY` and other required vars
- `NGROK_AUTHTOKEN` in project root `.env` (get one at https://ngrok.com)

## Usage

```bash
# Build and start server + ngrok tunnel
docker compose up -d

# Get your public URL (for Twilio webhook configuration)
# Option 1: ngrok web UI
open http://localhost:4040

# Option 2: curl the ngrok API
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1

# Option 3: container logs (URL appears when tunnel starts)
docker compose logs ngrok
```

Configure your Twilio phone number's webhook to:
- **A CALL COMES IN:** `https://<ngrok-url>/incoming-call`

The ngrok URL supports both HTTP and WSS (WebSocket Secure) for the media stream.
