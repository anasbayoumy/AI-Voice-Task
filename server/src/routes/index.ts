import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.routes';
import { twilioRoutes } from './twilio.routes';
import { mediaStreamRoutes } from './mediaStream.routes';
import { sessionRoutes } from './session.routes';
import { voiceRoutes } from './voice.routes';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(healthRoutes);
  await fastify.register(sessionRoutes);
  await fastify.register(voiceRoutes);
  await fastify.register(twilioRoutes);
  await fastify.register(mediaStreamRoutes);
}
