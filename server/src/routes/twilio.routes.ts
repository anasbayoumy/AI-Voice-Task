import type { FastifyInstance } from 'fastify';
import { TwilioController } from '../controllers/twilio.controller';

const twilioController = new TwilioController();

export async function twilioRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.all('/incoming-call', twilioController.handleIncomingCall.bind(twilioController));
}
