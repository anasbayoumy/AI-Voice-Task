import type { FastifyInstance } from 'fastify';
import { HealthController } from '../controllers/health.controller';

const healthController = new HealthController();

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', healthController.getHealth.bind(healthController));
  fastify.get('/health', healthController.getDetailedHealth.bind(healthController));
}
