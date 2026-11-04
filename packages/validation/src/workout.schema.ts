import { z } from 'zod';

export const muscleGroupSchema = z.enum([
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'full_body',
  'cardio',
]);

export const exerciseCategorySchema = z.enum([
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'band',
  'cardio',
]);

export const exerciseDifficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const exerciseSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  primaryMuscleGroup: muscleGroupSchema,
  secondaryMuscleGroups: z.array(muscleGroupSchema).default([]),
  category: exerciseCategorySchema,
  difficulty: exerciseDifficultySchema,
  instructions: z.string(),
  equipmentRequired: z.string(),
  isCustom: z.boolean().default(false),
});

export const setTypeSchema = z.enum(['warmup', 'standard', 'drop', 'failure']);

export const workoutSetSchema = z.object({
  id: z.string().uuid(),
  workoutSessionId: z.string().uuid(),
  exerciseId: z.string().min(1),
  setIndex: z.number().int().min(0),
  setType: setTypeSchema.default('standard'),
  weightKg: z.number().min(0).max(1000),
  reps: z.number().int().min(1).max(200),
  rpe: z.number().min(1).max(10).optional(),
  isCompleted: z.boolean().default(true),
});

export const workoutSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(128),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  clientCreatedAt: z.string().datetime(),
  clientUpdatedAt: z.string().datetime(),
  isDeleted: z.boolean().default(false),
});
