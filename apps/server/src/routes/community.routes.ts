import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { communityService } from '../services/community.service';

const createPostSchema = z.object({
  title: z.string().min(1).max(128),
  content: z.string().max(2000).optional(),
  workoutSessionId: z.string().uuid().optional(),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(500),
});

export async function communityRoutes(fastify: FastifyInstance) {
  // Public Feed
  fastify.get('/feed', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await communityService.getFeed();
      return reply.send({ success: true, posts: result.rows });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to retrieve feed' });
    }
  });

  // Create Activity Post (Authenticated)
  fastify.post('/posts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const user = request.user as { id?: string; sub?: string };
      const userId = user.id || user.sub;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const parsed = createPostSchema.parse(request.body);

      const post = await communityService.createPost({
        userId,
        title: parsed.title,
        content: parsed.content,
        workoutSessionId: parsed.workoutSessionId,
      });

      return reply.status(201).send({ success: true, post });
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ error: 'Validation failed', details: error.issues });
      }
      return reply.status(401).send({ error: 'Unauthorized or error creating post' });
    }
  });

  // Toggle Like on Post
  fastify.post('/posts/:id/like', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const user = request.user as { id?: string; sub?: string };
      const userId = user.id || user.sub;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const result = await communityService.toggleLike(request.params.id, userId);
      return reply.send({ success: true, ...result });
    } catch (error) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Add Comment on Post
  fastify.post('/posts/:id/comments', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const user = request.user as { id?: string; sub?: string };
      const userId = user.id || user.sub;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const parsed = createCommentSchema.parse(request.body);

      const comment = await communityService.addComment({
        userId,
        postId: request.params.id,
        content: parsed.content,
      });

      return reply.status(201).send({ success: true, comment });
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ error: 'Validation failed', details: error.issues });
      }
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Get Active Challenges
  fastify.get('/challenges', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await communityService.getChallenges();
      return reply.send({ success: true, challenges: result.rows });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to retrieve challenges' });
    }
  });

  // Join a Challenge
  fastify.post('/challenges/:id/join', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const user = request.user as { id: string };
      const result = await communityService.joinChallenge(request.params.id, user.id);
      return reply.send({ success: true, participant: result });
    } catch (error) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}
