import type { FastifyInstance } from 'fastify';
import { SessionController } from '../controllers/session.controller';
import { validate } from '../middleware/validate.middleware';
import { createSessionSchema, sessionIdSchema } from '../validators/session.validator';

const sessionController = new SessionController();

export async function sessionRoutes(fastify: FastifyInstance): Promise<void> {
  // Create new session
  fastify.post(
    '/api/v1/sessions',
    { preHandler: [validate(createSessionSchema)] },
    sessionController.create.bind(sessionController)
  );

  // Get session by ID
  fastify.get(
    '/api/v1/sessions/:id',
    { preHandler: [validate(sessionIdSchema)] },
    sessionController.get.bind(sessionController)
  );

  // End session
  fastify.delete(
    '/api/v1/sessions/:id',
    { preHandler: [validate(sessionIdSchema)] },
    sessionController.end.bind(sessionController)
  );

  // Get conversation history
  fastify.get(
    '/api/v1/sessions/:id/history',
    { preHandler: [validate(sessionIdSchema)] },
    sessionController.getHistory.bind(sessionController)
  );
}
