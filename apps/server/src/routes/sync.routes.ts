import { FastifyInstance, FastifyReply } from 'fastify';
import { SyncService } from '../services/sync.service';
import { syncPushBatchRequestSchema } from '@fitlife/validation';

export async function syncRoutes(fastify: FastifyInstance): Promise<void> {
  // Push offline batched mutations
  fastify.post('/sync/push', { preHandler: [(fastify as any).authenticate] }, async (request: any, reply: FastifyReply) => {
    const parse = syncPushBatchRequestSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parse.error.flatten().fieldErrors,
      });
    }

    const userId = request.user.sub;
    try {
      const response = await SyncService.processBatch(userId, parse.data);
      return reply.send(response);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'SYNC_PROCESSING_FAILED', message: err.message });
    }
  });

  // Pull server changes since client's last sync timestamp
  fastify.get('/sync/pull', { preHandler: [(fastify as any).authenticate] }, async (request: any, reply: FastifyReply) => {
    const userId = request.user.sub;
    const since = Number(request.query.since ?? 0);

    try {
      const response = await SyncService.pullChanges(userId, since);
      return reply.send(response);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'SYNC_PULL_FAILED', message: err.message });
    }
  });
}
