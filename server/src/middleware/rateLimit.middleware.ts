import type { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60;

function getClientKey(request: FastifyRequest): string {
  // Use X-Forwarded-For if behind proxy, otherwise use socket
  return (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
         request.socket.remoteAddress || 
         'unknown';
}

function cleanupOldEntries() {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}

export async function rateLimitMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Skip rate limiting for health check, test UI, and WebSocket routes
  if (request.url === '/' || request.url === '/health' || request.url.startsWith('/test/') || request.url.startsWith('/voice/stream') || request.url.startsWith('/media-stream')) {
    return;
  }

  cleanupOldEntries();

  const key = getClientKey(request);
  const now = Date.now();

  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + WINDOW_MS
    };
    return;
  }

  if (now > store[key].resetTime) {
    store[key] = {
      count: 1,
      resetTime: now + WINDOW_MS
    };
    return;
  }

  store[key].count++;

  if (store[key].count > MAX_REQUESTS) {
    return reply.status(429).send({
      error: 'Too many requests',
      retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
    });
  }

  // Set rate limit headers
  reply.header('X-RateLimit-Limit', MAX_REQUESTS.toString());
  reply.header('X-RateLimit-Remaining', (MAX_REQUESTS - store[key].count).toString());
  reply.header('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());
}
