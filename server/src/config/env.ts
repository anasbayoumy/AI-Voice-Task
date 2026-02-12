import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// validates and types all environment variables
const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  OPENAI_API_KEY: z.string().min(1, "OpenAI API Key is required"),
  TEST_MODE: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_WS_URL: z.string().optional(),
  SERVER_PUBLIC_URL: z.string().optional(),
  API_KEY: z.string().optional(),
  STATUS_CALLBACK_STRICT: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
});

export const config = envSchema.parse(process.env);
