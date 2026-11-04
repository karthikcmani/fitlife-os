import { buildApp } from './app';
import { env } from './config/env';
import { runMigrations } from './db/migrator';

async function start() {
  const app = buildApp();

  try {
    console.log('[FITLIFE OS Server] Checking database migrations...');
    await runMigrations().catch((err) => {
      console.warn('[FITLIFE OS Server] Database migration notice:', err.message);
    });

    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`[FITLIFE OS Server] Running on http://${env.HOST}:${env.PORT}`);
    console.log(`[FITLIFE OS Server] Health check available at: http://${env.HOST}:${env.PORT}/api/v1/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}
