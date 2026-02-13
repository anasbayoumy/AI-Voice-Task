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

  // Skip auth for voice stream WebSocket (optional for testing)
  if (request.url.startsWith('/voice/stream')) {
    return;
  }

  const authHeader = request.headers.authorization;
  const apiKey = request.headers['x-api-key'] as string | undefined;

  const providedKey = authHeader?.replace('Bearer ', '') || apiKey;

  if (!providedKey) {
    return reply.status(401).send({ error: 'Missing API key' });
  }

  // Constant-time comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(providedKey),
    Buffer.from(config.auth.apiKey)
  );

  if (!isValid) {
    return reply.status(401).send({ error: 'Invalid API key' });
  }
}
