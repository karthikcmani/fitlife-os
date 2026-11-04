import { buildApp } from '../app';
import { db, pool } from '../db/database';
import { sql } from 'kysely';

describe('End-to-End Live Backend & Database Integration Tests', () => {
  const timestamp = Date.now();
  const testUser = {
    username: `testuser_${timestamp}`,
    email: `test_${timestamp}@fitlife.org`,
    password: 'SecurePassword123!',
  };

  let app: any;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (userId) {
      try {
        await sql`DELETE FROM users WHERE id = ${userId}`.execute(db);
      } catch {}
    }
    await app.close();
    await pool.end();
  });

  describe('1. Health & Server Startup', () => {
    it('verifies server startup and health check endpoint', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.status).toBe('healthy');
      expect(json.system).toBe('FITLIFE OS API');
    });
  });

  describe('2. Authentication Flow & Security', () => {
    it('registers a new user with Argon2id password hashing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: testUser,
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.payload);
      expect(json.user.username).toBe(testUser.username);
      expect(json.tokens.accessToken).toBeDefined();
      expect(json.tokens.refreshToken).toBeDefined();

      userId = json.user.id;
      accessToken = json.tokens.accessToken;
      refreshToken = json.tokens.refreshToken;

      // Verify record exists directly in PostgreSQL users table
      const dbUser = await sql<any>`SELECT * FROM users WHERE id = ${userId}`.execute(db);
      expect(dbUser.rows.length).toBe(1);
      expect(dbUser.rows[0].email).toBe(testUser.email);
      // Verify password is not plaintext, but Argon2id hash
      expect(dbUser.rows[0].password_hash).toMatch(/^\$argon2id\$/);
    });

    it('rejects duplicate user registration', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: testUser,
      });
      expect(res.statusCode).toBe(409);
    });

    it('rejects invalid credentials on login', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          emailOrUsername: testUser.email,
          password: 'WrongPassword!',
        },
      });
      expect(res.statusCode).toBe(401);
    });

    it('successfully logs in with valid credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          emailOrUsername: testUser.email,
          password: testUser.password,
        },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.tokens.accessToken).toBeDefined();
      accessToken = json.tokens.accessToken;
    });

    it('refreshes token session', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.tokens.accessToken).toBeDefined();
      accessToken = json.tokens.accessToken;
      refreshToken = json.tokens.refreshToken;
    });

    it('verifies authenticated user identity via /me', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.user.id).toBe(userId);
      expect(json.user.username).toBe(testUser.username);
    });
  });

  describe('3. Offline Synchronization Engine', () => {
    const sessionId = '123e4567-e89b-12d3-a456-426614174099';
    const batchId = '123e4567-e89b-12d3-a456-' + Date.now().toString().padStart(12, '0').slice(-12);

    it('pushes workout mutations with HLC ordering and stores in sync_records', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/sync/push',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          batchId,
          clientHlc: { physicalTimeMs: Date.now(), logicalCounter: 1 },
          mutations: [
            {
              clientQueueId: 1,
              entityType: 'workout_sessions',
              entityId: sessionId,
              operation: 'INSERT',
              payload: {
                title: 'Live Push Day Session',
                started_at: new Date().toISOString(),
              },
              hlc: { physicalTimeMs: Date.now(), logicalCounter: 1 },
            },
          ],
        },
      });

      if (res.statusCode !== 200) {
        console.error('SYNC PUSH FAILED:', res.payload);
      }

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.batchId).toBe(batchId);
      expect(json.results).toBeDefined();

      // Verify physical record exists in PostgreSQL sync_records table
      const syncRec = await sql<any>`
        SELECT * FROM sync_records WHERE user_id = ${userId} AND entity_id = ${sessionId}
      `.execute(db);
      expect(syncRec.rows.length).toBe(1);
      expect(syncRec.rows[0].entity_type).toBe('workout_sessions');
    });

    it('enforces idempotency: ignores duplicate batch submission without side-effects', async () => {
      // Repeat the exact same push request
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/sync/push',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          batchId,
          clientHlc: { physicalTimeMs: Date.now(), logicalCounter: 1 },
          mutations: [
            {
              clientQueueId: 1,
              entityType: 'workout_sessions',
              entityId: sessionId,
              operation: 'INSERT',
              payload: {
                title: 'Live Push Day Session',
                started_at: new Date().toISOString(),
              },
              hlc: { physicalTimeMs: Date.now(), logicalCounter: 1 },
            },
          ],
        },
      });

      if (res.statusCode !== 200) {
        console.error('SYNC PUSH FAILED:', res.payload);
      }

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.batchId).toBe(batchId);

      // Count in PostgreSQL must strictly remain 1
      const countRes = await sql<any>`
        SELECT COUNT(*) as count FROM sync_records WHERE user_id = ${userId} AND entity_id = ${sessionId}
      `.execute(db);
      expect(parseInt(countRes.rows[0].count, 10)).toBe(1);
    });

    it('pulls mutations since given HLC', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/sync/pull?since=0',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.records).toBeDefined();
      expect(Array.isArray(json.records)).toBe(true);
      expect(json.records.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4. Community Platform Endpoints', () => {
    let createdPostId: string;

    it('fetches community challenges', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/community/challenges',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.challenges)).toBe(true);
    });

    it('creates an activity post with explicit consent', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/community/posts',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: 'Bench Press PR 100kg!',
          content: 'Achieved progressive overload goal.',
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.post.title).toBe('Bench Press PR 100kg!');
      createdPostId = json.post.id;

      // Verify row in PostgreSQL
      const postRows = await sql<any>`SELECT * FROM activity_posts WHERE id = ${createdPostId}`.execute(db);
      expect(postRows.rows.length).toBe(1);
    });

    it('toggles kudos/likes on post', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/community/posts/${createdPostId}/like`,
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.liked).toBe(true);
    });

    it('adds a supportive comment to post', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/community/posts/${createdPostId}/comments`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          content: 'Incredible work, keep pushing!',
        },
      });
      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.payload);
      expect(json.comment.content).toBe('Incredible work, keep pushing!');
    });
  });

  describe('5. Session Termination & Account Management', () => {
    it('revokes refresh token on logout', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: { refreshToken },
      });
      expect(res.statusCode).toBe(200);

      // Verify token is invalidated on subsequent refresh
      const refreshTry = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });
      expect(refreshTry.statusCode).toBe(401);
    });
  });
});
