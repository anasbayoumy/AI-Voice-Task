import { IncomingMessage, ServerResponse } from 'http';

type CorsHeaders = Record<string, string>;

// handles cors preflight requests for /api/* routes
export function handleCors(req: IncomingMessage, res: ServerResponse, cors: CorsHeaders) {
  res.writeHead(204, { ...cors, 'Access-Control-Max-Age': '86400' });
  res.end();
}
