import { WebSocketServer } from 'ws';
import http from 'http';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { handleWebConnection } from './handlers/webHandler.js';
import { handleTwilioConnection } from './handlers/twilioHandler.js';
import { requireWebSocketAuth } from './utils/auth.js';
import { handleHttpRequest } from './routes/index.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

// creates and configures http server
const server = http.createServer((req, res) => {
  handleHttpRequest(req, res, CORS_HEADERS);
});

// creates and configures websocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const path = (req.url || '').split('?')[0] ?? '';

  logger.info({ path }, 'Incoming WebSocket Connection');

  if (path === '/web') {
    if (!requireWebSocketAuth(req.url, ws)) return;
    handleWebConnection(ws);
  } else if (path === '/phone' || path?.startsWith('/phone?')) {
    handleTwilioConnection(ws, req);
  } else {
    logger.warn({ path }, 'Unknown WebSocket route rejected');
    ws.close();
  }
});

// starts http and websocket server
server.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
});
