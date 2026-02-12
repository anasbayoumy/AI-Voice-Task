import { IncomingMessage, ServerResponse } from 'http';
import { config } from '../config/env.js';
import { logger } from './logger.js';

type CorsHeaders = Record<string, string>;

// checks api key from authorization or x-api-key header and rejects if invalid
export function requireApiKey(req: IncomingMessage, res: ServerResponse, cors: CorsHeaders = {}): boolean {
  if (!config.API_KEY) {
    return true;
  }

  const authHeader = req.headers['authorization'];
  const xApiKey = req.headers['x-api-key'];
  
  let providedKey: string | undefined;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7);
  } else if (xApiKey && typeof xApiKey === 'string') {
    providedKey = xApiKey;
  }

  if (!providedKey || providedKey !== config.API_KEY) {
    logger.warn({ 
      path: req.url,
      hasAuth: !!authHeader,
      hasXApiKey: !!xApiKey,
    }, 'Unauthorized API request');
    
    res.writeHead(401, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Unauthorized',
      message: 'Valid API key required. Send via Authorization: Bearer <key> or X-API-Key header.'
    }));
    return false;
  }

  return true;
}

// checks websocket token from query param and closes connection if invalid
export function requireWebSocketAuth(url: string | undefined, ws: any): boolean {
  if (!config.API_KEY) {
    return true;
  }

  try {
    const parsedUrl = new URL(url || '', 'wss://dummy.com');
    const token = parsedUrl.searchParams.get('token');

    if (!token || token !== config.API_KEY) {
      logger.warn({ url }, 'Unauthorized WebSocket connection');
      ws.close(4001, 'Unauthorized: Invalid or missing token');
      return false;
    }

    return true;
  } catch (err) {
    logger.error({ err, url }, 'Failed to parse WebSocket URL');
    ws.close(4000, 'Bad Request');
    return false;
  }
}
