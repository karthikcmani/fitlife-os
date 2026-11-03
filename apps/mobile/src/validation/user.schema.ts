import { z } from 'zod';

export const genderSchema = z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']);

export const fitnessLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const activityLevelSchema = z.enum([
  'sedentary',
  'light',
  'moderate',
  'very_active',
  'extreme',
]);

export const primaryGoalSchema = z.enum([
  'fat_loss',
  'muscle_gain',
  'recomposition',
  'strength',
  'maintenance',
]);

export const trainingEnvironmentSchema = z.enum(['gym', 'home', 'calisthenics']);

export const unitSystemSchema = z.enum(['metric', 'imperial']);

export const profileSetupSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(64),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
  gender: genderSchema.optional(),
  heightCm: z.number().min(80, 'Height must be at least 80 cm').max(260, 'Height exceeds maximum limit'),
  currentWeightKg: z.number().min(25, 'Weight must be at least 25 kg').max(350, 'Weight exceeds maximum limit'),
  fitnessLevel: fitnessLevelSchema,
  activityLevel: activityLevelSchema,
  primaryGoal: primaryGoalSchema,
  trainingEnvironment: trainingEnvironmentSchema.default('gym'),
  preferredUnitSystem: unitSystemSchema.default('metric'),
  dailyWaterTargetMl: z.number().int().min(500).max(10000).default(3000),
});

export type ProfileSetupSchemaInput = z.infer<typeof profileSetupSchema>;
