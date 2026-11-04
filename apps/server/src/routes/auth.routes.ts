import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';
import { db } from '../db/database';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  profileSetupSchema,
} from '@fitlife/validation';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // 1. Register
  fastify.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const parse = registerSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parse.error.flatten().fieldErrors,
      });
    }

    try {
      const user = await AuthService.registerUser(parse.data);
      const accessToken = fastify.jwt.sign({ sub: user.id, id: user.id, username: user.username }, { expiresIn: '15m' });
      const { token: refreshToken } = await AuthService.createRefreshToken(
        user.id,
        undefined,
        request.headers['user-agent']
      );

      return reply.status(201).send({
        success: true,
        user,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 900,
        },
      });
    } catch (err: any) {
      if (err.message === 'EMAIL_ALREADY_EXISTS' || err.message === 'USERNAME_ALREADY_EXISTS') {
        return reply.status(409).send({ error: err.message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // 2. Login
  fastify.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parse = loginSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parse.error.flatten().fieldErrors,
      });
    }

    try {
      const user = await AuthService.validateUserCredentials(parse.data);
      const accessToken = fastify.jwt.sign({ sub: user.id, id: user.id, username: user.username }, { expiresIn: '15m' });
      const { token: refreshToken } = await AuthService.createRefreshToken(
        user.id,
        undefined,
        request.headers['user-agent']
      );

      return reply.send({
        success: true,
        user,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 900,
        },
      });
    } catch (err: any) {
      if (err.message === 'INVALID_CREDENTIALS') {
        return reply.status(401).send({ error: 'INVALID_CREDENTIALS' });
      }
      if (err.message === 'ACCOUNT_INACTIVE') {
        return reply.status(403).send({ error: 'ACCOUNT_INACTIVE' });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // 3. Refresh Token
  fastify.post('/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const parse = refreshTokenSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR' });
    }

    try {
      const { userId, newRefreshToken } = await AuthService.rotateRefreshToken(
        parse.data.refreshToken,
        request.headers['user-agent']
      );

      const user = await db.selectFrom('users').where('id', '=', userId).selectAll().executeTakeFirst();
      if (!user) {
        return reply.status(401).send({ error: 'USER_NOT_FOUND' });
      }

      const accessToken = fastify.jwt.sign({ sub: user.id, id: user.id, username: user.username }, { expiresIn: '15m' });

      return reply.send({
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: 900,
        },
      });
    } catch (err: any) {
      if (err.message === 'TOKEN_REUSE_DETECTED') {
        return reply.status(401).send({ error: 'TOKEN_REUSE_DETECTED' });
      }
      return reply.status(401).send({ error: 'INVALID_REFRESH_TOKEN' });
    }
  });

  // 4. Logout
  fastify.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    if (body?.refreshToken) {
      await AuthService.revokeSession(body.refreshToken);
    }
    return reply.send({ success: true });
  });

  // 5. Get current authenticated user profile (Protected)
  fastify.get('/auth/me', { preHandler: [(fastify as any).authenticate] }, async (request: any, reply) => {
    const userId = request.user.sub;
    const user = await db.selectFrom('users').where('id', '=', userId).selectAll().executeTakeFirst();
    if (!user) {
      return reply.status(404).send({ error: 'USER_NOT_FOUND' });
    }

    const profile = await db.selectFrom('user_profiles').where('user_id', '=', userId).selectAll().executeTakeFirst();

    return reply.send({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isActive: user.is_active,
        isVerified: user.is_verified,
        createdAt: user.created_at.toISOString(),
      },
      profile: profile ?? null,
    });
  });

  // 6. Update user profile (Protected)
  fastify.post('/auth/profile', { preHandler: [(fastify as any).authenticate] }, async (request: any, reply) => {
    const parse = profileSetupSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parse.error.flatten().fieldErrors,
      });
    }

    const userId = request.user.sub;
    const d = parse.data;

    await db
      .insertInto('user_profiles')
      .values({
        user_id: userId,
        display_name: d.displayName,
        date_of_birth: d.dateOfBirth ?? null,
        gender: d.gender ?? null,
        height_cm: d.heightCm,
        current_weight_kg: d.currentWeightKg,
        fitness_level: d.fitnessLevel,
        activity_level: d.activityLevel,
        primary_goal: d.primaryGoal,
        training_environment: d.trainingEnvironment,
        preferred_unit_system: d.preferredUnitSystem,
        daily_water_target_ml: d.dailyWaterTargetMl,
      })
      .onConflict((oc) =>
        oc.column('user_id').doUpdateSet({
          display_name: d.displayName,
          date_of_birth: d.dateOfBirth ?? null,
          gender: d.gender ?? null,
          height_cm: d.heightCm,
          current_weight_kg: d.currentWeightKg,
          fitness_level: d.fitnessLevel,
          activity_level: d.activityLevel,
          primary_goal: d.primaryGoal,
          training_environment: d.trainingEnvironment,
          preferred_unit_system: d.preferredUnitSystem,
          daily_water_target_ml: d.dailyWaterTargetMl,
          updated_at: new Date(),
        })
      )
      .execute();

    return reply.send({ success: true });
  });

  // 7. Delete Account (Protected - GDPR / Sovereignty compliance)
  fastify.delete('/auth/account', { preHandler: [(fastify as any).authenticate] }, async (request: any, reply) => {
    const userId = request.user.sub;
    await AuthService.deleteUserAccount(userId);
    return reply.send({ success: true, message: 'ACCOUNT_PERMANENTLY_PURGED' });
  });
}
