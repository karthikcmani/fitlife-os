import { buildApp } from '../app';

describe('Health Check API', () => {
  it('returns healthy status with system info and timestamp', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.status).toBe('healthy');
    expect(json.system).toBe('FITLIFE OS API');
    expect(json.version).toBe('1.0.0');
    expect(typeof json.uptime).toBe('number');
    expect(new Date(json.timestamp).getTime()).not.toBeNaN();
    await app.close();
  });
});
