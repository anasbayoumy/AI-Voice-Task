import { z } from 'zod';

export const createSessionSchema = z.object({
  body: z.object({
    source: z.enum(['web', 'phone']).optional().default('web'),
    metadata: z.record(z.string(), z.any()).optional().default({})
  })
});

export const sessionIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID format')
  })
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SessionIdInput = z.infer<typeof sessionIdSchema>;
