# Server Architecture

This is a clean architecture implementation of the Twilio Media Stream Server with OpenAI Realtime API integration.

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── index.ts          # Configuration management
│   ├── controllers/
│   │   ├── health.controller.ts      # Health check endpoint
│   │   ├── twilio.controller.ts      # Twilio webhook handling
│   │   └── mediaStream.controller.ts # WebSocket connections
│   ├── services/
│   │   └── openai.service.ts # OpenAI Realtime API integration
│   ├── routes/
│   │   ├── health.routes.ts
│   │   ├── twilio.routes.ts
│   │   ├── mediaStream.routes.ts
│   │   └── index.ts          # Route registration
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   └── index.ts              # Application entry point
├── .env                      # Environment variables
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Architecture Layers

### 1. **Config Layer** (`src/config/`)
- Manages environment variables
- Provides centralized configuration
- Validates required settings on startup

### 2. **Types Layer** (`src/types/`)
- TypeScript interfaces and types
- Ensures type safety across the application

### 3. **Services Layer** (`src/services/`)
- **OpenAIService**: Manages WebSocket connection to OpenAI
  - Handles audio streaming
  - Manages conversation state
  - Processes speech interruptions

### 4. **Controllers Layer** (`src/controllers/`)
- **HealthController**: Health check endpoint
- **TwilioController**: Handles incoming call webhooks
- **MediaStreamController**: Manages WebSocket connections

### 5. **Routes Layer** (`src/routes/`)
- Defines API endpoints
- Connects routes to controllers
- Centralized route registration

## Running the Server

### Development
```bash
npm start          # Run with tsx
npm run dev        # Run with watch mode
```

### Production
```bash
npm run build      # Compile TypeScript
node dist/index.js # Run compiled code
```

### Docker
```bash
docker compose up -d
```

## API Endpoints

- `GET /` - Health check
- `POST /incoming-call` - Twilio webhook for incoming calls
- `WS /media-stream` - WebSocket endpoint for Twilio Media Streams

## Environment Variables

See `.env` file for configuration options:
- `PORT` - Server port (default: 2050)
- `OPENAI_API_KEY` - OpenAI API key (required)
