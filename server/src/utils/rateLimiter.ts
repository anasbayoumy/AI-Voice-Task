import { IncomingMessage, ServerResponse } from 'http';
import { logger } from './logger.js';

type CorsHeaders = Record<string, string>;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMITS = {
  initiate: { maxRequests: 10, windowMs: 60000 },
  other: { maxRequests: 30, windowMs: 60000 },
};

// cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart > 120000) {
      rateLimitMap.delete(key);
    }
  }
}, 300000);

// extracts client ip from request headers (handles proxies)
function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return req.socket.remoteAddress || 'unknown';
}

// checks if request exceeds rate limit and sends 429 if so
export function checkRateLimit(
  req: IncomingMessage, 
  res: ServerResponse, 
  scope: 'initiate' | 'other',
  cors: CorsHeaders = {}
): boolean {
  const ip = getClientIp(req);
  const limit = RATE_LIMITS[scope];
  const key = `${scope}:${ip}`;
  const now = Date.now();

  let entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > limit.windowMs) {
    entry = { count: 0, windowStart: now };
    rateLimitMap.set(key, entry);
  }

  const currentEntry = rateLimitMap.get(key)!;
  currentEntry.count++;

  if (currentEntry.count > limit.maxRequests) {
    const resetTime = Math.ceil((currentEntry.windowStart + limit.windowMs - now) / 1000);
    
    logger.warn({ 
      ip, 
      scope, 
      count: currentEntry.count, 
      limit: limit.maxRequests,
      resetIn: resetTime 
    }, 'Rate limit exceeded');
    
    res.writeHead(429, { 
      ...cors, 
      'Content-Type': 'application/json',
      'Retry-After': resetTime.toString()
    });
    res.end(JSON.stringify({ 
      error: 'Rate limit exceeded',
      message: `Too many ${scope} requests. Try again in ${resetTime} seconds.`,
      retryAfter: resetTime
    }));
    return false;
  }

  return true;
}
