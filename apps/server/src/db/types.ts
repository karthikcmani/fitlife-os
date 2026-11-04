import { Generated } from 'kysely';

export interface UsersTable {
  id: Generated<string>;
  username: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface RefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  family_id: string;
  device_info: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Generated<Date>;
}

export interface UserProfilesTable {
  user_id: string;
  display_name: string;
  date_of_birth: string | null;
  gender: string | null;
  height_cm: number;
  current_weight_kg: number;
  fitness_level: string;
  activity_level: string;
  primary_goal: string;
  training_environment: string;
  preferred_unit_system: string;
  daily_water_target_ml: number;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ExercisesTable {
  id: string; // slug e.g. 'barbell-bench-press'
  name: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  category: string;
  difficulty: string;
  instructions: string;
  equipment_required: string;
  is_custom: boolean;
  created_by_user_id: string | null;
  created_at: Generated<Date>;
}

export interface WorkoutSessionsTable {
  id: Generated<string>;
  user_id: string;
  title: string;
  started_at: Date;
  ended_at: Date | null;
  notes: string | null;
  client_created_at: Date;
  client_updated_at: Date;
  server_synced_at: Generated<Date>;
  is_deleted: boolean;
}

export interface WorkoutSetsTable {
  id: Generated<string>;
  workout_session_id: string;
  exercise_id: string;
  set_index: number;
  set_type: string;
  weight_kg: number;
  reps: number;
  rpe: number | null;
  is_completed: boolean;
  created_at: Generated<Date>;
}

export interface FoodsTable {
  id: Generated<string>;
  name: string;
  brand: string | null;
  region: string;
  serving_size_g: number;
  serving_unit_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  data_source: string;
  is_verified: boolean;
  created_by_user_id: string | null;
  created_at: Generated<Date>;
}

export interface MealsTable {
  id: Generated<string>;
  user_id: string;
  meal_type: string;
  logged_date: string;
  client_created_at: Date;
  server_synced_at: Generated<Date>;
  is_deleted: boolean;
}

export interface MealItemsTable {
  id: Generated<string>;
  meal_id: string;
  food_id: string;
  servings: number;
  grams_consumed: number;
  calculated_calories: number;
  calculated_protein_g: number;
  calculated_carbs_g: number;
  calculated_fat_g: number;
}

export interface HydrationLogsTable {
  id: Generated<string>;
  user_id: string;
  logged_at: Date;
  amount_ml: number;
  client_created_at: Date;
  is_deleted: boolean;
}

export interface HabitsTable {
  id: Generated<string>;
  user_id: string;
  title: string;
  icon: string;
  target_frequency: string;
  days_of_week: number[];
  is_archived: boolean;
  created_at: Generated<Date>;
}

export interface HabitCompletionsTable {
  id: Generated<string>;
  habit_id: string;
  user_id: string;
  completed_date: string;
  completed_at: Date;
}

export interface SleepLogsTable {
  id: Generated<string>;
  user_id: string;
  sleep_date: string;
  bedtime: Date;
  wake_time: Date;
  duration_minutes: number;
  subjective_quality: number;
  notes: string | null;
  client_created_at: Date;
  is_deleted: boolean;
}

export interface BodyMeasurementsTable {
  id: Generated<string>;
  user_id: string;
  measured_date: string;
  weight_kg: number;
  waist_cm: number | null;
  chest_cm: number | null;
  arms_cm: number | null;
  thighs_cm: number | null;
  hips_cm: number | null;
  neck_cm: number | null;
  notes: string | null;
  created_at: Generated<Date>;
}

export interface SyncRecordsTable {
  id: Generated<number>;
  user_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  client_timestamp: number;
  server_timestamp: number;
  payload: Record<string, unknown>;
}

export interface IdempotencyLedgerTable {
  batch_id: string;
  user_id: string;
  status: string;
  response_payload: Record<string, unknown>;
  created_at: Generated<Date>;
  expires_at: Date;
}

export interface Database {
  users: UsersTable;
  refresh_tokens: RefreshTokensTable;
  user_profiles: UserProfilesTable;
  exercises: ExercisesTable;
  workout_sessions: WorkoutSessionsTable;
  workout_sets: WorkoutSetsTable;
  foods: FoodsTable;
  meals: MealsTable;
  meal_items: MealItemsTable;
  hydration_logs: HydrationLogsTable;
  habits: HabitsTable;
  habit_completions: HabitCompletionsTable;
  sleep_logs: SleepLogsTable;
  body_measurements: BodyMeasurementsTable;
  sync_records: SyncRecordsTable;
  idempotency_ledger: IdempotencyLedgerTable;
}
