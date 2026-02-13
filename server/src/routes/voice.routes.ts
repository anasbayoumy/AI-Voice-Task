import type { FastifyInstance } from 'fastify';
import { VoiceStreamController } from '../controllers/voiceStream.controller';

const voiceStreamController = new VoiceStreamController();

export async function voiceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/voice/stream', { websocket: true }, (connection, request) => {
    const { sessionId, voice } = request.query as { sessionId?: string; voice?: string };
    console.log('📞 /voice/stream WebSocket request - sessionId:', sessionId, 'voice:', voice);
    console.log('   Full query:', JSON.stringify(request.query));
    voiceStreamController.handleConnection(connection, sessionId, voice);
  });
}
