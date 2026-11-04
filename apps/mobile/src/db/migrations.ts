import { SQLiteDatabase } from 'expo-sqlite';
import { seedExercises } from './seedExercises';
import { seedFoods } from './seedFoods';

export async function runLocalMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _local_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = await db.getAllAsync<{ version: number }>(
    `SELECT version FROM _local_migrations WHERE version = 1`
  );

  if (applied.length === 0) {
    await db.execAsync(`
      -- 1. User Profiles
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        date_of_birth TEXT,
        gender TEXT,
        height_cm REAL NOT NULL,
        current_weight_kg REAL NOT NULL,
        fitness_level TEXT NOT NULL,
        activity_level TEXT NOT NULL,
        primary_goal TEXT NOT NULL,
        training_environment TEXT NOT NULL DEFAULT 'gym',
        preferred_unit_system TEXT NOT NULL DEFAULT 'metric',
        daily_water_target_ml INTEGER NOT NULL DEFAULT 3000,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 2. Exercises Library
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        primary_muscle_group TEXT NOT NULL,
        secondary_muscle_groups TEXT NOT NULL DEFAULT '[]',
        category TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        instructions TEXT NOT NULL,
        equipment_required TEXT NOT NULL,
        is_custom INTEGER NOT NULL DEFAULT 0,
        created_by_user_id TEXT,
        created_at TEXT NOT NULL
      );

      -- 3. Workout Sessions & Sets
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        notes TEXT,
        client_created_at TEXT NOT NULL,
        client_updated_at TEXT NOT NULL,
        is_deleted INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS workout_sets (
        id TEXT PRIMARY KEY,
        workout_session_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        set_index INTEGER NOT NULL,
        set_type TEXT NOT NULL DEFAULT 'standard',
        weight_kg REAL NOT NULL,
        reps INTEGER NOT NULL,
        rpe REAL,
        is_completed INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );

      -- 4. Foods & Meals
      CREATE TABLE IF NOT EXISTS foods (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT,
        region TEXT NOT NULL DEFAULT 'global',
        serving_size_g REAL NOT NULL,
        serving_unit_name TEXT NOT NULL DEFAULT 'g',
        calories REAL NOT NULL,
        protein_g REAL NOT NULL,
        carbs_g REAL NOT NULL,
        fat_g REAL NOT NULL,
        fiber_g REAL NOT NULL DEFAULT 0,
        data_source TEXT NOT NULL,
        is_verified INTEGER NOT NULL DEFAULT 1,
        created_by_user_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS meals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        logged_date TEXT NOT NULL,
        client_created_at TEXT NOT NULL,
        is_deleted INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS meal_items (
        id TEXT PRIMARY KEY,
        meal_id TEXT NOT NULL,
        food_id TEXT NOT NULL,
        servings REAL NOT NULL DEFAULT 1.0,
        grams_consumed REAL NOT NULL,
        calculated_calories REAL NOT NULL,
        calculated_protein_g REAL NOT NULL,
        calculated_carbs_g REAL NOT NULL,
        calculated_fat_g REAL NOT NULL,
        FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
        FOREIGN KEY (food_id) REFERENCES foods(id)
      );

      -- 5. Hydration, Habits & Sleep
      CREATE TABLE IF NOT EXISTS hydration_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        logged_at TEXT NOT NULL,
        amount_ml INTEGER NOT NULL,
        client_created_at TEXT NOT NULL,
        is_deleted INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'check',
        target_frequency TEXT NOT NULL DEFAULT 'daily',
        days_of_week TEXT NOT NULL DEFAULT '[1,2,3,4,5,6,7]',
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS habit_completions (
        id TEXT PRIMARY KEY,
        habit_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        completed_date TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        UNIQUE(habit_id, completed_date),
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sleep_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        sleep_date TEXT NOT NULL UNIQUE,
        bedtime TEXT NOT NULL,
        wake_time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        subjective_quality INTEGER NOT NULL,
        notes TEXT,
        client_created_at TEXT NOT NULL,
        is_deleted INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS body_measurements (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        measured_date TEXT NOT NULL UNIQUE,
        weight_kg REAL NOT NULL,
        waist_cm REAL,
        chest_cm REAL,
        arms_cm REAL,
        thighs_cm REAL,
        hips_cm REAL,
        neck_cm REAL,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      -- 6. Offline Sync Management Queue
      CREATE TABLE IF NOT EXISTS sync_queue (
        queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );

      CREATE TABLE IF NOT EXISTS sync_metadata (
        entity_type TEXT PRIMARY KEY,
        last_server_sync_timestamp INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Seed baseline exercises and verified Indian/global foods
    await seedExercises(db);
    await seedFoods(db);

    await db.runAsync(
      `INSERT INTO _local_migrations (version, applied_at) VALUES (1, ?);`,
      [Date.now()]
    );
  }

  const applied2 = await db.getAllAsync<{ version: number }>(
    `SELECT version FROM _local_migrations WHERE version = 2`
  );

  if (applied2.length === 0) {
    try {
      await db.execAsync(`
        ALTER TABLE user_profiles ADD COLUMN available_training_days INTEGER NOT NULL DEFAULT 3;
      `);
    } catch {
      // Column may already exist
    }

    try {
      await db.execAsync(`
        ALTER TABLE exercises ADD COLUMN simple_explanation TEXT;
        ALTER TABLE exercises ADD COLUMN beginner_instructions TEXT;
        ALTER TABLE exercises ADD COLUMN common_mistakes TEXT;
        ALTER TABLE exercises ADD COLUMN easier_alternatives TEXT;
        ALTER TABLE exercises ADD COLUMN recommended_sets INTEGER DEFAULT 3;
        ALTER TABLE exercises ADD COLUMN recommended_reps TEXT DEFAULT '8-12 reps';
        ALTER TABLE exercises ADD COLUMN recommended_rest_sec INTEGER DEFAULT 60;
      `);
    } catch {
      // Columns may already exist
    }

    // Refresh exercises and foods catalog with expanded familiar Indian/Kerala foods and beginner exercise cues
    await seedExercises(db);
    await seedFoods(db);

    await db.runAsync(
      `INSERT INTO _local_migrations (version, applied_at) VALUES (2, ?);`,
      [Date.now()]
    );
  }

  const applied3 = await db.getAllAsync<{ version: number }>(
    `SELECT version FROM _local_migrations WHERE version = 3`
  );

  if (applied3.length === 0) {
    try {
      await db.execAsync(`
        ALTER TABLE user_profiles ADD COLUMN session_duration_minutes INTEGER NOT NULL DEFAULT 30;
        ALTER TABLE user_profiles ADD COLUMN equipment_inventory TEXT NOT NULL DEFAULT '["none"]';
        ALTER TABLE user_profiles ADD COLUMN dietary_preference TEXT NOT NULL DEFAULT 'vegetarian';
        ALTER TABLE user_profiles ADD COLUMN injuries_or_limitations TEXT NOT NULL DEFAULT '["none"]';
        ALTER TABLE user_profiles ADD COLUMN body_measurements TEXT NOT NULL DEFAULT '{}';
      `);
    } catch {
      // Columns may already exist
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS coaching_plans (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          primary_goal TEXT NOT NULL,
          goal_title TEXT NOT NULL,
          baseline_summary TEXT NOT NULL,
          weekly_workouts TEXT NOT NULL,
          daily_meals TEXT NOT NULL,
          daily_water_target_ml INTEGER NOT NULL DEFAULT 2500,
          progression_milestones TEXT NOT NULL,
          why_plan TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        ALTER TABLE exercises ADD COLUMN breathing_guidance TEXT;
        ALTER TABLE exercises ADD COLUMN starting_position TEXT;
        ALTER TABLE exercises ADD COLUMN targeted_muscles_simple TEXT;
        ALTER TABLE exercises ADD COLUMN why_included TEXT;
        ALTER TABLE exercises ADD COLUMN harder_alternatives TEXT;
      `);
    } catch {
      // May already exist
    }

    await db.runAsync(
      `INSERT INTO _local_migrations (version, applied_at) VALUES (3, ?);`,
      [Date.now()]
    );
  }
}
