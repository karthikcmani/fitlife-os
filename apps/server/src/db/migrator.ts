import fs from 'fs';
import path from 'path';
import { sql } from 'kysely';
import { db } from './database';

export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  // Ensure migrations tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const existing = await sql<{ id: number }>`
      SELECT id FROM _migrations WHERE name = ${file}
    `.execute(db);

    if (existing.rows.length === 0) {
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await sql.raw(sqlContent).execute(db);
      await sql`
        INSERT INTO _migrations (name) VALUES (${file})
      `.execute(db);
      console.log(`[Database Migration] Successfully applied: ${file}`);
    }
  }
}
