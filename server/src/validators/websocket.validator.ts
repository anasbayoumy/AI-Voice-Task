import { z } from 'zod';

// WebSocket connection query params
export const wsConnectionSchema = z.object({
  query: z.object({
    token: z.string().optional(),
    sessionId: z.string().uuid().optional()
  })
});

// WebSocket message validation
export const wsMessageSchema = z.object({
  type: z.enum(['audio', 'control', 'ping']),
  data: z.any().optional()
});

export type WsConnectionInput = z.infer<typeof wsConnectionSchema>;
export type WsMessageInput = z.infer<typeof wsMessageSchema>;
