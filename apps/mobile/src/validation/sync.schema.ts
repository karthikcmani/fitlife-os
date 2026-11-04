import { z } from 'zod';

export const hlcTimestampSchema = z.object({
  physicalTimeMs: z.number().int().nonnegative(),
  logicalCounter: z.number().int().nonnegative(),
});

export const syncOperationSchema = z.enum(['INSERT', 'UPDATE', 'DELETE']);

export const syncEntityTypeSchema = z.enum([
  'user_profiles',
  'workout_sessions',
  'workout_sets',
  'meals',
  'meal_items',
  'hydration_logs',
  'habits',
  'habit_completions',
  'sleep_logs',
  'body_measurements',
]);

export const syncMutationPacketSchema = z.object({
  clientQueueId: z.number().int().positive(),
  entityType: syncEntityTypeSchema,
  entityId: z.string().min(1),
  operation: syncOperationSchema,
  payload: z.record(z.unknown()),
  hlc: hlcTimestampSchema,
});

export const syncPushBatchRequestSchema = z.object({
  batchId: z.string().uuid(),
  clientHlc: hlcTimestampSchema,
  mutations: z.array(syncMutationPacketSchema).max(100),
});
