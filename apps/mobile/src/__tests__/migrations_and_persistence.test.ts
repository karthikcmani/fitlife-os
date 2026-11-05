import { runLocalMigrations } from '../db/migrations';

describe('SQLite Migrations & Schema Resilience Tests', () => {
  // Mock SQLiteDatabase mimicking expo-sqlite
  const createMockDb = (initialTables: Record<string, string[]> = {}, appliedVersions: number[] = []) => {
    const executedStatements: string[] = [];
    const tables: Record<string, string[]> = { ...initialTables };
    const migrations: number[] = [...appliedVersions];

    const mockDb: any = {
      execAsync: jest.fn(async (sql: string) => {
        executedStatements.push(sql);
        // Track ALTER TABLE ADD COLUMN statements
        const alterMatches = sql.matchAll(/ALTER TABLE (\w+) ADD COLUMN (\w+)/gi);
        for (const match of alterMatches) {
          const table = match[1];
          const col = match[2];
          if (!tables[table]) tables[table] = [];
          if (!tables[table].includes(col)) tables[table].push(col);
        }
      }),

      runAsync: jest.fn(async (sql: string, params: any[] = []) => {
        executedStatements.push(sql);
        if (sql.includes('INSERT INTO _local_migrations')) {
          const match = sql.match(/VALUES\s*\(\s*(\d+)/i);
          const version = match ? parseInt(match[1], 10) : (params[0] ?? 1);
          migrations.push(version);
        }
        return { changes: 1, lastInsertRowId: 1 };
      }),

      getAllAsync: jest.fn(async (sql: string, params: any[] = []) => {
        executedStatements.push(sql);

        // Check _local_migrations
        if (sql.includes('FROM _local_migrations WHERE version =')) {
          const match = sql.match(/version = (\d+)/);
          const version = match ? parseInt(match[1], 10) : 0;
          return migrations.includes(version) ? [{ version }] : [];
        }

        // Check PRAGMA table_info
        if (sql.includes('PRAGMA table_info(')) {
          const match = sql.match(/PRAGMA table_info\((\w+)\)/);
          const table = match ? match[1] : '';
          const cols = tables[table] || [];
          return cols.map((name) => ({ name }));
        }

        return [];
      }),

      getFirstAsync: jest.fn(async (sql: string) => {
        executedStatements.push(sql);
        return null;
      }),

      withTransactionAsync: jest.fn(async (callback: () => Promise<void>) => {
        await callback();
      }),
    };

    return { mockDb, executedStatements, tables, migrations };
  };

  it('runs all migrations 1 through 5 on a fresh installation', async () => {
    const { mockDb, migrations } = createMockDb();

    await runLocalMigrations(mockDb);

    // All versions 1, 2, 3, 4, 5 must be recorded in _local_migrations
    expect(migrations).toContain(1);
    expect(migrations).toContain(2);
    expect(migrations).toContain(3);
    expect(migrations).toContain(4);
    expect(migrations).toContain(5);
  });

  it('safely upgrades an existing database that has versions 1-4 but lacks is_deleted on workout_sets', async () => {
    // Simulate legacy installed database
    const initialTables = {
      workout_sets: ['id', 'workout_session_id', 'exercise_id', 'set_index', 'weight_kg', 'reps', 'is_completed'],
      workout_sessions: ['id', 'user_id', 'title', 'started_at', 'ended_at'],
      body_measurements: ['id', 'user_id', 'measured_date', 'weight_kg'],
      user_profiles: ['user_id', 'display_name', 'current_weight_kg'],
      sleep_logs: ['id', 'user_id', 'sleep_date', 'duration_minutes'],
    };
    const { mockDb, tables, migrations } = createMockDb(initialTables, [1, 2, 3, 4]);

    // Before migration 5: workout_sets has no is_deleted
    expect(tables.workout_sets).not.toContain('is_deleted');

    await runLocalMigrations(mockDb);

    // Migration 5 must be recorded
    expect(migrations).toContain(5);

    // Columns must be added
    expect(tables.workout_sets).toContain('is_deleted');
    expect(tables.workout_sets).toContain('client_created_at');
    expect(tables.workout_sets).toContain('client_updated_at');

    expect(tables.body_measurements).toContain('date');
    expect(tables.body_measurements).toContain('measured_at');
    expect(tables.body_measurements).toContain('is_deleted');

    expect(tables.user_profiles).toContain('experience_mode');
    expect(tables.user_profiles).toContain('theme_appearance');
    expect(tables.user_profiles).toContain('theme_color');

    expect(tables.sleep_logs).toContain('source');
  });

  it('is idempotent: running migrations on an already-upgraded database does not duplicate or fail', async () => {
    const upgradedTables = {
      workout_sets: ['id', 'is_deleted', 'client_created_at', 'client_updated_at'],
      body_measurements: ['id', 'date', 'measured_at', 'is_deleted'],
      user_profiles: ['user_id', 'experience_mode', 'theme_appearance', 'theme_color', 'unavailable_equipment'],
      sleep_logs: ['id', 'source', 'sleep_stages'],
    };
    const { mockDb, tables, migrations } = createMockDb(upgradedTables, [1, 2, 3, 4, 5]);

    await runLocalMigrations(mockDb);

    // Migrations list should still have 5 versions, no duplicates
    expect(migrations.filter((v) => v === 5).length).toBe(1);
    expect(tables.workout_sets).toContain('is_deleted');
  });
});
