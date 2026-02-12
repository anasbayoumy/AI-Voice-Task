import pino from 'pino';
import { config } from '../config/env.js';

// structured json logger with timestamps and process id
export const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.LOG_LEVEL === 'debug' &&
    process.env.NODE_ENV !== 'production' && {
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }),
  base: { pid: process.pid },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});
