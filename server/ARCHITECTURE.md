# Clean Architecture Implementation - Complete Guide

## 📁 Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── index.ts                    # Configuration & env validation
│   │
│   ├── types/
│   │   └── index.ts                    # TypeScript interfaces
│   │
│   ├── services/
│   │   └── openai.service.ts           # OpenAI WebSocket service
│   │
│   ├── controllers/
│   │   ├── health.controller.ts        # Health check handler
│   │   ├── twilio.controller.ts        # Twilio webhook handler
│   │   └── mediaStream.controller.ts   # WebSocket connection handler
│   │
│   ├── routes/
│   │   ├── health.routes.ts            # Health routes
│   │   ├── twilio.routes.ts            # Twilio routes
│   │   ├── mediaStream.routes.ts       # WebSocket routes
│   │   └── index.ts                    # Route registration
│   │
│   └── index.ts                        # Application entry point
│
├── .env                                # Environment variables
├── .gitignore                          # Git ignore rules
├── package.json                        # Dependencies & scripts
├── tsconfig.json                       # TypeScript config
├── Dockerfile                          # Docker image definition
├── README.md                           # Documentation
├── REFACTORING.md                      # Migration notes
└── index.ts.backup                     # Old monolithic file (backup)
```

## 🏗️ Architecture Layers

### 1. Entry Point (`src/index.ts`)
- Initializes Fastify
- Registers plugins (WebSocket, FormBody)
- Registers routes
- Starts the server

### 2. Configuration (`src/config/`)
- Loads environment variables
- Provides typed config object
- Validates required settings
- Centralizes all configuration

### 3. Types (`src/types/`)
- `MediaStreamState` - WebSocket connection state
- `OpenAISessionConfig` - OpenAI configuration
- `TwilioMediaEvent` - Twilio event types
- `OpenAIMessage` - OpenAI message types

### 4. Services (`src/services/`)

#### OpenAIService
- Manages WebSocket connection to OpenAI
- Handles session initialization
- Processes audio streaming
- Manages conversation state
- Handles speech interruptions
- Communicates with Twilio Media Stream

**Key Methods:**
- `connect()` - Establish WebSocket connection
- `handleTwilioMessage()` - Process Twilio events
- `handleOpenAIMessage()` - Process OpenAI responses
- `close()` - Clean up connection

### 5. Controllers (`src/controllers/`)

#### HealthController
- Simple health check endpoint
- Returns server status

#### TwilioController
- Handles incoming call webhook
- Generates TwiML response
- Configures Media Stream connection

#### MediaStreamController
- Manages WebSocket connections
- Creates OpenAI service instance per connection
- Handles connection lifecycle

### 6. Routes (`src/routes/`)

Each route file:
- Defines endpoints
- Connects to controllers
- Registers with Fastify

**Endpoints:**
- `GET /` - Health check
- `POST|GET /incoming-call` - Twilio webhook
- `WS /media-stream` - Media stream WebSocket

## 🔄 Request Flow

### HTTP Request (Health Check)
```
Client → Route → Controller → Response
```

### Twilio Incoming Call
```
Twilio → /incoming-call → TwilioController → TwiML Response
```

### WebSocket Media Stream
```
Twilio → /media-stream → MediaStreamController
                        ↓
                   OpenAIService (creates connection)
                        ↓
                   OpenAI Realtime API
```

## 🎯 Key Benefits

1. **Separation of Concerns**
   - Each layer has a specific responsibility
   - Easy to understand and navigate

2. **Type Safety**
   - Full TypeScript support
   - Compile-time error detection

3. **Testability**
   - Services can be unit tested
   - Controllers can be integration tested
   - Dependencies are injectable

4. **Maintainability**
   - Small, focused files
   - Clear code organization
   - Easy to locate functionality

5. **Scalability**
   - Add new routes easily
   - Add new services without refactoring
   - Clear patterns for new features

## 🚀 Usage

### Development
```bash
npm start          # Start server
npm run dev        # Start with auto-reload
```

### Production
```bash
npm run build      # Compile TypeScript
node dist/index.js # Run compiled code
```

### Docker
```bash
docker compose up -d       # Start with Docker
docker compose logs ngrok  # Get ngrok URL
```

## 📝 Adding New Features

### Add a New Route
1. Create controller in `src/controllers/`
2. Create route file in `src/routes/`
3. Register in `src/routes/index.ts`

### Add a New Service
1. Create service in `src/services/`
2. Inject dependencies via constructor
3. Use in controllers

### Add Configuration
1. Add to `.env`
2. Add to `src/config/index.ts`
3. Use via `config` import

## 🔍 Code Quality

- ✅ No linter errors
- ✅ Full TypeScript coverage
- ✅ Clean separation of concerns
- ✅ Consistent naming conventions
- ✅ Well-documented architecture

## 📚 Next Steps

Consider adding:
- Unit tests (`*.test.ts`)
- Integration tests
- Error handling middleware
- Logging service
- Rate limiting
- Authentication middleware
- API documentation (Swagger)
