import type { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await schema.parseAsync({
        body: request.body,
        query: request.query,
        params: request.params
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.issues.map((e: any) => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      return reply.status(400).send({ error: 'Invalid request' });
    }
  };
}
