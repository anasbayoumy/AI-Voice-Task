import { IncomingMessage, ServerResponse } from 'http';

type CorsHeaders = Record<string, string>;

// returns health status and timestamp
export function handleHealth(req: IncomingMessage, res: ServerResponse, cors: CorsHeaders = {}) {
  res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  }));
}
