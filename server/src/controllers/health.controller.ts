import type { FastifyRequest, FastifyReply } from 'fastify';
import { SessionService } from '../services/session.service';
import { AuditService } from '../services/audit.service';
import { getPool } from '../db/client';

export class HealthController {
  private sessionService: SessionService;
  private auditService: AuditService;

  constructor() {
    this.sessionService = new SessionService();
    this.auditService = new AuditService();
  }

  async getHealth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send({ message: 'Twilio Media Stream Server is running!' });
  }

  async getDetailedHealth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // Check database
    try {
      await getPool().query('SELECT 1');
      health.checks.database = 'healthy';
    } catch (error) {
      health.checks.database = 'unhealthy';
      health.status = 'degraded';
    }

    // Check OpenAI API key
    health.checks.openai = process.env.OPENAI_API_KEY ? 'configured' : 'missing';
    if (!process.env.OPENAI_API_KEY) {
      health.status = 'unhealthy';
    }

    reply.send(health);
  }
}
