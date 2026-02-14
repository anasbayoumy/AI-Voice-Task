import type { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';
import crypto from 'crypto';

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Skip auth for health check and public endpoints
  if (request.url === '/' || request.url === '/health' || request.url.startsWith('/test/')) {
    return;
  }

  // Skip auth for Twilio webhooks (they have their own validation)
  if (request.url.startsWith('/incoming-call') || request.url.startsWith('/media-stream')) {
    return;
  }

  // Skip auth for WebSocket routes (they handle auth internally)
  if (request.url.startsWith('/voice/stream')) {
    return;
  }

  // Auth is NOT required if AUTH_REQUIRED is false
  if (!config.auth.required) {
    return;
  }

  const authHeader = request.headers.authorization;
  const apiKey = request.headers['x-api-key'] as string | undefined;

  const providedKey = authHeader?.replace('Bearer ', '') || apiKey;

  if (!providedKey) {
    return reply.status(401).send({ error: 'Missing API key' });
  }

  // Constant-time comparison to prevent timing attacks
  try {
    const providedBuffer = Buffer.from(providedKey);
    const expectedBuffer = Buffer.from(config.auth.apiKey);
    
    // Check length first (not constant-time, but necessary for timingSafeEqual)
    if (providedBuffer.length !== expectedBuffer.length) {
      return reply.status(401).send({ error: 'Invalid API key' });
    }
    
    const isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
    
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid API key' });
    }
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid API key' });
  }
}
