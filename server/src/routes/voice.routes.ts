import type { FastifyInstance } from 'fastify';
import { VoiceStreamController } from '../controllers/voiceStream.controller';
import { config } from '../config';
import crypto from 'crypto';

const voiceStreamController = new VoiceStreamController();

export async function voiceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/voice/stream', { websocket: true }, (connection, request) => {
    // Check auth if required
    if (config.auth.required) {
      const { token } = request.query as { token?: string };
      const authHeader = request.headers.authorization;
      const apiKeyHeader = request.headers['x-api-key'] as string | undefined;

      const providedKey = token || authHeader?.replace('Bearer ', '') || apiKeyHeader;

      if (!providedKey) {
        connection.send(JSON.stringify({ type: 'error', message: 'Missing API key' }));
        connection.close();
        return;
      }

      // Constant-time comparison
      try {
        const isValid = crypto.timingSafeEqual(
          Buffer.from(providedKey),
          Buffer.from(config.auth.apiKey)
        );

        if (!isValid) {
          connection.send(JSON.stringify({ type: 'error', message: 'Invalid API key' }));
          connection.close();
          return;
        }
      } catch (error) {
        // Buffer length mismatch or other error
        connection.send(JSON.stringify({ type: 'error', message: 'Invalid API key' }));
        connection.close();
        return;
      }
    }

    const { sessionId, voice } = request.query as { sessionId?: string; voice?: string };
    console.log('📞 /voice/stream WebSocket request - sessionId:', sessionId, 'voice:', voice);
    console.log('   Full query:', JSON.stringify(request.query));
    voiceStreamController.handleConnection(connection, sessionId, voice);
  });
}
