import type { FastifyRequest, FastifyReply } from 'fastify';
import { SessionService } from '../services/session.service';

export class SessionController {
  private sessionService: SessionService;

  constructor() {
    this.sessionService = new SessionService();
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { source = 'web', metadata = {} } = request.body as any;

    try {
      const session = await this.sessionService.createSession(source, metadata);

      reply.status(201).send({
        sessionId: session.id,
        wsUrl: `/voice/stream?sessionId=${session.id}`,
        status: 'created'
      });
    } catch (error) {
      console.error('Failed to create session:', error);
      reply.status(500).send({ error: 'Failed to create session' });
    }
  }

  async get(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };

    try {
      const session = await this.sessionService.getSession(id);

      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      reply.send(session);
    } catch (error) {
      console.error('Failed to get session:', error);
      reply.status(500).send({ error: 'Failed to get session' });
    }
  }

  async end(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };

    try {
      await this.sessionService.endSession(id);
      reply.send({ status: 'ended' });
    } catch (error) {
      console.error('Failed to end session:', error);
      reply.status(500).send({ error: 'Failed to end session' });
    }
  }

  async getHistory(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };

    try {
      const history = await this.sessionService.getConversationHistory(id);
      reply.send({ sessionId: id, history });
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      reply.status(500).send({ error: 'Failed to get conversation history' });
    }
  }
}
