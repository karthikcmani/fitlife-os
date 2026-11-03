import { buildApp } from '../app';

describe('Sync API Routes & Effectively-Once Processing', () => {
  it('rejects sync push without valid JWT authorization header', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/push',
      payload: {
        batchId: '123e4567-e89b-12d3-a456-426614174000',
        clientHlc: { physicalTimeMs: Date.now(), logicalCounter: 1 },
        mutations: [],
      },
    });

    expect(response.statusCode).toBe(401);
    const json = JSON.parse(response.payload);
    expect(json.error).toBe('UNAUTHORIZED');
    await app.close();
  });

  it('rejects sync pull without valid JWT authorization header', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/pull?sinceHlc=1741000000000:0001:node1',
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('validates malformed batch payloads on authenticated requests', async () => {
    const app = buildApp();
    await app.ready();
    // Generate valid test JWT
    const token = app.jwt.sign({ id: '123e4567-e89b-12d3-a456-426614174001', username: 'tester' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/push',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        // missing batchId and clientHlc
        mutations: 'invalid_array',
      },
    });

    expect(response.statusCode).toBe(400);
    const json = JSON.parse(response.payload);
    expect(json.error).toBe('VALIDATION_ERROR');
    await app.close();
  });
});
