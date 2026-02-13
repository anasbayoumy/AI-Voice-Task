/// <reference types="node" />
import Fastify from 'fastify';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { config } from './config';
import { registerRoutes } from './routes';
import { authMiddleware } from './middleware/auth.middleware';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import { runMigrations, closePool } from './db/client';

async function start(): Promise<void> {
  const fastify = Fastify({
    logger: false
  });

  // Register CORS
  await fastify.register(fastifyCors, {
    origin: config.cors.origin,
    credentials: config.cors.credentials
  });

  // Register plugins
  await fastify.register(fastifyFormBody);
  await fastify.register(fastifyWs);

  // Serve static files (test client)
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/test/'
  });

  // Register middleware
  fastify.addHook('onRequest', rateLimitMiddleware);
  if (config.auth.required) {
    fastify.addHook('onRequest', authMiddleware);
  }

  // Run database migrations
  console.log('📦 Running database migrations...');
  let dbConnected = false;
  try {
    await runMigrations();
    console.log('✓ Database migrations completed');
    dbConnected = true;
  } catch (error) {
    console.log('⚠️  Database not available - continuing without DB features');
    console.error('   DB Error:', error instanceof Error ? error.message : error);
    console.log('   Start PostgreSQL: docker compose up -d postgres');
    console.log('   Or run locally: DATABASE_URL=postgresql://biami:biami_secure_pass@localhost:5432/biami');
  }

  // Register routes
  await fastify.register(registerRoutes);

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      try {
        await fastify.close();
        await closePool();
        console.log('✓ Server closed');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    });
  });

  // Start server
  try {
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎙️  BIAMI VOICE AGENT SERVER                              ║
║                                                              ║
║   Server:    http://${config.host}:${config.port}                         ║
║   Auth:      ${config.auth.required ? 'Enabled' : 'Disabled'}                                       ║
║   Database:  ${dbConnected ? 'Connected' : 'Not connected'}                                    ║
║   Test UI:   http://localhost:${config.port}/test/test-client.html   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
