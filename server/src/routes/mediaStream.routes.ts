import type { FastifyInstance } from 'fastify';
import { MediaStreamController } from '../controllers/mediaStream.controller';

const mediaStreamController = new MediaStreamController();

export async function mediaStreamRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/media-stream', { websocket: true }, (connection) => {
    mediaStreamController.handleConnection(connection);
  });
}
