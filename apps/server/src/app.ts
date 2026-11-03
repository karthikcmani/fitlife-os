import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { env } from './config/env';
import { healthRoutes } from './routes/health.routes';
import { authRoutes } from './routes/auth.routes';
import { syncRoutes } from './routes/sync.routes';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  // CORS
  app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Rate Limiting
  app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW,
  });

  // JWT Plugin
  app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  // Authentication Decorator
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Valid authorization token required' });
    }
  });

  // Register Routes with version prefix /api/v1
  app.register(
    async (v1) => {
      v1.register(healthRoutes);
      v1.register(authRoutes);
      v1.register(syncRoutes);
    },
    { prefix: '/api/v1' }
  );

  return app;
}
